import express from 'express';
import nodemailer from 'nodemailer';
import Anthropic from '@anthropic-ai/sdk';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { QuickQuote } from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Logo pour PDF (resolu depuis server/routes/ vers public/). Meme image que celle servie en URL au HTML.
const LOGO_FILE_PATH = path.resolve(__dirname, '../../public/Logo-DELIVERY-Digital-Neo-sans-Bold noir_ 2 copie 5.png');

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

const router = express.Router();
const publicRouter = express.Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
};

const PUBLIC_BASE = 'https://deliverydigital.fr';
const LOGO_URL = `${PUBLIC_BASE}/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png`;

/* ===========================================================
   Catalogue de services pre-builts (templates)
   =========================================================== */
/* Taux de change live via Frankfurter (BCE, gratuit, pas de cle) */
const rateCache = new Map();
const RATE_TTL_MS = 60 * 60 * 1000; // 1h

router.get('/exchange-rate', requireAdmin, async (req, res) => {
  try {
    const from = String(req.query.from || 'EUR').toUpperCase();
    const to = String(req.query.to || 'USD').toUpperCase();
    if (from === to) return res.json({ rate: 1, from, to, cached: false });

    const cacheKey = `${from}-${to}`;
    const hit = rateCache.get(cacheKey);
    if (hit && Date.now() - hit.at < RATE_TTL_MS) {
      return res.json({ rate: hit.rate, from, to, cached: true, asOf: new Date(hit.at).toISOString() });
    }

    // Frankfurter (BCE) - gratuit. Limitation : pas toutes les devises (manque AED, MAD, TND, etc.).
    // Fallback : open.er-api.com (gratuit aussi).
    let rate = null;
    try {
      const r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      if (r.ok) {
        const d = await r.json();
        rate = d?.rates?.[to];
      }
    } catch {}

    if (!rate) {
      try {
        const r = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        if (r.ok) {
          const d = await r.json();
          rate = d?.rates?.[to];
        }
      } catch {}
    }

    if (!rate) return res.status(502).json({ error: 'unable to fetch rate' });

    rateCache.set(cacheKey, { rate, at: Date.now() });
    res.json({ rate, from, to, cached: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/catalog', requireAdmin, (req, res) => {
  res.json({
    catalog: [
      // Web
      { id: 'site-vitrine', category: 'Web', label: 'Site vitrine sur mesure', defaultPrice: 990, unit: 'forfait', description: 'Site corporate sur mesure (5-8 pages), responsive, optimise SEO de base.' },
      { id: 'site-saas', category: 'Web', label: 'Plateforme SaaS / dashboard', defaultPrice: 18000, unit: 'forfait', description: 'Application web complete : auth, dashboard, base de donnees, deploiement.' },
      { id: 'site-ecommerce', category: 'Web', label: 'E-commerce sur mesure', defaultPrice: 12000, unit: 'forfait', description: 'Boutique en ligne complete : catalogue, panier, checkout, gestion commandes, espace admin.' },
      { id: 'refonte', category: 'Web', label: 'Refonte de site existant', defaultPrice: 8500, unit: 'forfait', description: 'Reprise, migration, modernisation d\'un site existant.' },

      // Mobile
      { id: 'app-mobile', category: 'Mobile', label: 'Application mobile iOS + Android', defaultPrice: 15000, unit: 'forfait', description: 'App mobile native (React Native), 2 stores, notifications, base de donnees. Design non inclus (a chiffrer en sus si besoin).' },
      { id: 'app-mobile-mvp', category: 'Mobile', label: 'MVP application mobile (1 plateforme)', defaultPrice: 12000, unit: 'forfait', description: 'Version minimale viable iOS OU Android, 5-7 ecrans cles, deploiement TestFlight ou interne.' },
      { id: 'pwa', category: 'Mobile', label: 'Progressive Web App (PWA)', defaultPrice: 6500, unit: 'forfait', description: 'Application web installable, offline, notifications push - alternative legere aux apps natives.' },

      // Logiciels metier
      { id: 'crm-sur-mesure', category: 'Logiciels', label: 'CRM sur mesure', defaultPrice: 22000, unit: 'forfait', description: 'Pipeline ventes, gestion contacts, tasks, automatisations, export.' },
      { id: 'erp-modulaire', category: 'Logiciels', label: 'ERP modulaire', defaultPrice: 35000, unit: 'forfait', description: 'Stock, achats, ventes, comptabilite, RH - modules selon vos besoins.' },
      { id: 'plateforme-b2b', category: 'Logiciels', label: 'Plateforme B2B / marketplace', defaultPrice: 28000, unit: 'forfait', description: 'Multi-vendeurs, gestion produits, commissions, paiements split.' },
      { id: 'gestion-projet', category: 'Logiciels', label: 'Outil de gestion de projet interne', defaultPrice: 14000, unit: 'forfait', description: 'Planning, taches, equipes, suivi temps, rapports.' },

      // Paiement
      { id: 'stripe-integration', category: 'Paiement', label: 'Integration Stripe (paiement par carte)', defaultPrice: 300, unit: 'forfait', description: 'Stripe Checkout ou Stripe Elements, gestion paiement unique, webhooks, page succes/echec.' },
      { id: 'stripe-subscription', category: 'Paiement', label: 'Stripe abonnements (SaaS)', defaultPrice: 500, unit: 'forfait', description: 'Stripe Billing : abonnements recurrents, plans tarifaires, customer portal, webhooks, gestion echec paiement.' },
      { id: 'stripe-marketplace', category: 'Paiement', label: 'Stripe Connect (marketplace)', defaultPrice: 5500, unit: 'forfait', description: 'Stripe Connect Express, paiements split entre vendeurs, KYC, payouts automatiques.' },
      { id: 'apple-google-pay', category: 'Paiement', label: 'Apple Pay + Google Pay', defaultPrice: 300, unit: 'forfait', description: 'Activation Apple Pay (iOS/Safari) et Google Pay (Android/Chrome) sur votre site. Verification domaine, certificats, integration boutons natifs.' },
      { id: 'paypal-integration', category: 'Paiement', label: 'Integration PayPal', defaultPrice: 1200, unit: 'forfait', description: 'Bouton PayPal, gestion ordre + capture, webhooks IPN.' },
      { id: 'paiement-multi', category: 'Paiement', label: 'Multi-providers (Stripe + PayPal + Apple/Google Pay)', defaultPrice: 4500, unit: 'forfait', description: 'Couverture complete des moyens de paiement modernes, abstraction propre cote backend.' },

      // SEO / Marketing
      { id: 'seo-audit', category: 'SEO', label: 'Audit SEO complet', defaultPrice: 1500, unit: 'forfait', description: 'Audit technique, contenu, backlinks, analyse concurrentielle, recommandations priorisees.' },
      { id: 'seo-onpage', category: 'SEO', label: 'Optimisation SEO on-page', defaultPrice: 2500, unit: 'forfait', description: 'Meta tags, Schema.org JSON-LD, sitemap, robots, headings, alt images, vitesse, Core Web Vitals.' },
      { id: 'seo-articles-pack-10', category: 'SEO', label: 'Pack 10 articles SEO longue traine', defaultPrice: 1800, unit: 'forfait', description: '10 articles 1200-1800 mots, optimises mots-cles cibles, brief + redaction + integration.' },
      { id: 'seo-articles-pack-30', category: 'SEO', label: 'Pack 30 articles SEO longue traine', defaultPrice: 4500, unit: 'forfait', description: '30 articles, ciblage longue traine, redaction qualifiee + IA, integration.' },
      { id: 'seo-pages-villes', category: 'SEO', label: 'Pages programmatiques service x ville', defaultPrice: 3500, unit: 'pack 50 pages', description: 'Generation de pages SEO ciblees par ville (ex: 50 pages : 5 services x 10 villes), Schema.org, indexation Search Console.' },
      { id: 'seo-pages-pays', category: 'SEO', label: 'Pages SEO multi-pays', defaultPrice: 6500, unit: 'pack 100 pages', description: '100 pages SEO ciblant differents pays/marches (international), traduction multi-langue, hreflang.' },
      { id: 'seo-monthly', category: 'SEO', label: 'Suivi SEO mensuel', defaultPrice: 1200, unit: 'mois', description: 'Monitoring positions, ajustements, 4 articles/mois, rapport mensuel, optimisations continues.' },
      { id: 'seo-geo', category: 'SEO', label: 'GEO (Generative Engine Optimization)', defaultPrice: 2500, unit: 'forfait', description: 'Optimisation pour les moteurs IA (ChatGPT, Perplexity, Claude, Google AI Overviews) : llms.txt, robots.txt bots IA, contenu citable, FAQ Schema.' },

      // Cloud / Infra
      { id: 'cloud-setup', category: 'Cloud', label: 'Mise en place Cloud / DevOps', defaultPrice: 4500, unit: 'forfait', description: 'AWS, CI/CD, monitoring, scalabilite, securite, backups.' },
      { id: 'migration-cloud', category: 'Cloud', label: 'Migration vers le cloud', defaultPrice: 7500, unit: 'forfait', description: 'Migration depuis hebergement existant vers AWS/GCP/Azure, zero downtime, rollback safe.' },
      { id: 'infra-as-code', category: 'Cloud', label: 'Infrastructure as Code (Terraform)', defaultPrice: 6000, unit: 'forfait', description: 'Codification de l\'infra, deploiement reproductible, environnements dev/staging/prod.' },

      // IA
      { id: 'ia-chatbot', category: 'IA', label: 'Chatbot / agent IA Claude', defaultPrice: 6500, unit: 'forfait', description: 'Chatbot Claude branche sur vos donnees, conversation, qualification leads, contexte personnalise.' },
      { id: 'ia-rag', category: 'IA', label: 'Recherche IA sur vos documents (RAG)', defaultPrice: 8500, unit: 'forfait', description: 'Vectorisation, indexation, recherche semantique, reponses sourcees sur votre base documentaire.' },
      { id: 'ia-vision', category: 'IA', label: 'Analyse d\'images / documents par IA', defaultPrice: 5500, unit: 'forfait', description: 'OCR, classification, extraction structuree (factures, BL, contrats), Claude Vision.' },
      { id: 'ia-automation', category: 'IA', label: 'Automatisations IA workflow', defaultPrice: 7500, unit: 'forfait', description: 'Workflow IA dans vos outils (n8n, Zapier custom, AWS Step Functions), bots metiers.' },

      // Design
      { id: 'design-ui-ux', category: 'Design', label: 'Design UI / UX', defaultPrice: 3500, unit: 'forfait', description: 'Maquettes Figma, prototype clickable, design system, parcours utilisateurs.' },
      { id: 'design-system', category: 'Design', label: 'Design system complet', defaultPrice: 5500, unit: 'forfait', description: 'Tokens, composants, theming, documentation Figma + code (React).' },
      { id: 'logo-brand', category: 'Design', label: 'Identite visuelle (logo + charte)', defaultPrice: 2500, unit: 'forfait', description: 'Logo, palette, typographies, declinaisons, charte graphique exportable.' },

      // Integrations / API
      { id: 'integration-api', category: 'Integrations', label: 'Integration API / connecteur', defaultPrice: 3500, unit: 'forfait', description: 'Connexion entre vos outils existants, automatisation des flux de donnees.' },
      { id: 'webhook-system', category: 'Integrations', label: 'Systeme de webhooks', defaultPrice: 2500, unit: 'forfait', description: 'Production et consommation de webhooks, reliabilite (retry, dead letter), securite signatures.' },

      // Acquisition / Outbound
      { id: 'outbound-platform', category: 'Acquisition', label: 'Plateforme prospection outbound (scraping + cold email auto)', defaultPrice: 12000, unit: 'forfait', description: 'Crawler de prospects par secteur/zone (LinkedIn, Sirene, annuaires), enrichissement contacts (email + telephone), sequences de cold email automatisees, suivi (ouvertures, clics, reponses), warmup boites, gestion blacklist + desinscriptions RGPD, dashboard de pilotage.' },
      { id: 'outbound-campaign-monthly', category: 'Acquisition', label: 'Gestion campagne outbound mensuelle', defaultPrice: 1500, unit: 'mois', description: 'Operation mensuelle : extraction prospects cibles, redaction sequences IA, lancement, monitoring, ajustements A/B, reporting hebdomadaire. Boites SMTP cote client.' },
      { id: 'outbound-enrichment', category: 'Acquisition', label: 'Pack enrichissement 1000 prospects', defaultPrice: 800, unit: 'pack 1000', description: 'Verification email (bounce check), recuperation telephone direct, profil LinkedIn, taille entreprise, CA. Fichier CSV livre.' },

      // Autres
      { id: 'audit-tech', category: 'Audit', label: 'Audit technique', defaultPrice: 1500, unit: 'forfait', description: 'Revue complete du code, securite, performance, recommandations.' },
      { id: 'audit-securite', category: 'Audit', label: 'Audit securite', defaultPrice: 2500, unit: 'forfait', description: 'OWASP Top 10, pentest leger, recommandations.' },
      { id: 'maintenance', category: 'Maintenance', label: 'Maintenance mensuelle', defaultPrice: 800, unit: 'mois', description: 'Mises a jour, surveillance, corrections de bugs, evolutions mineures.' },
      { id: 'support-prio', category: 'Maintenance', label: 'Support prioritaire (SLA 4h)', defaultPrice: 1500, unit: 'mois', description: 'Reponse sous 4h ouvrees, hotline, resolution des incidents critiques.' },
      { id: 'formation-team', category: 'Formation', label: 'Formation equipe technique', defaultPrice: 1200, unit: 'jour', description: 'Formation sur mesure pour vos equipes (React, Node, AWS, ...).' },
    ],
  });
});

/* ===========================================================
   Translate via Claude (champs libres uniquement)
   =========================================================== */
const LANG_NAMES = { fr: 'francais', en: 'anglais (English)', es: 'espagnol (Español)', de: 'allemand (Deutsch)', it: 'italien (Italiano)', pt: 'portugais (Português)', ar: 'arabe (العربية)', zh: 'chinois (中文)' };

// Date locale par langue : utilise pour formater dates dans devis et factures.
// @author Rabah Ziane - 2026-05-11
const DATE_LOCALES = {
  fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT',
  nl: 'nl-NL', sv: 'sv-SE', da: 'da-DK', no: 'nb-NO', fi: 'fi-FI',
  pl: 'pl-PL', cs: 'cs-CZ', hu: 'hu-HU', el: 'el-GR', tr: 'tr-TR',
  ru: 'ru-RU', ar: 'ar-SA', fa: 'fa-IR', hi: 'hi-IN', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
};
function getDateLocale(lang) {
  return DATE_LOCALES[(lang || 'fr').toLowerCase()] || 'fr-FR';
}

router.post('/:id/translate', requireAdmin, async (req, res) => {
  try {
    if (!anthropic) return res.status(500).json({ error: 'ANTHROPIC_API_KEY missing' });
    const { target } = req.body;
    if (!target || !LANG_NAMES[target]) return res.status(400).json({ error: 'invalid target language' });

    const quote = await QuickQuote.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'not found' });

    const sourceLang = LANG_NAMES[(quote.language || 'fr').toLowerCase()] || 'francais';
    const targetLang = LANG_NAMES[target];

    const payload = {
      title: quote.title || '',
      intro: quote.intro || '',
      lines: (quote.lines || []).map((l) => ({ description: l.description || '', details: l.details || '', unit: l.unit || '' })),
      notes: quote.notes || '',
    };

    const prompt = `Traduis fidelement ce devis du ${sourceLang} vers le ${targetLang}.

REGLES :
- Garde les noms propres tels quels : DELIVERY Digital, CII, Stripe, AWS, React, Next.js, etc.
- Garde les nombres et montants tels quels.
- Le ton est professionnel mais naturel dans la langue cible.
- Traduis le champ "unit" aussi (ex: "forfait" -> "package" en anglais, "mois" -> "month").
- Reponds UNIQUEMENT en JSON valide, meme structure que l'entree.

CONTENU A TRADUIRE :
${JSON.stringify(payload, null, 2)}`;

    const r = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = r.content[0]?.text || '';
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('no JSON in response');
    const translated = JSON.parse(text.slice(start, end + 1));

    quote.title = translated.title || quote.title;
    quote.intro = translated.intro || quote.intro;
    if (Array.isArray(translated.lines) && translated.lines.length === quote.lines.length) {
      quote.lines.forEach((l, i) => {
        const t = translated.lines[i];
        if (t) {
          l.description = t.description || l.description;
          l.details = t.details || l.details;
          l.unit = t.unit || l.unit;
        }
      });
    }
    quote.notes = translated.notes || quote.notes;
    quote.language = target;
    await quote.save();

    res.json({ item: quote });
  } catch (e) {
    console.error('translate error:', e);
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   CRUD
   =========================================================== */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, q, limit = 100 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.$or = [
      { 'client.name': { $regex: q, $options: 'i' } },
      { 'client.email': { $regex: q, $options: 'i' } },
      { 'client.company': { $regex: q, $options: 'i' } },
      { ref: { $regex: q, $options: 'i' } },
    ];
    const items = await QuickQuote.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit, 10)).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await QuickQuote.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({ item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = req.body || {};
    const quote = await QuickQuote.create(data);
    res.json({ item: quote });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['client', 'title', 'intro', 'lines', 'taxRate', 'ciiEligible', 'validUntil', 'notes', 'prospectId', 'status', 'currency', 'secondaryCurrency', 'secondaryRate', 'discountType', 'discountValue', 'language', 'issuer', 'paymentSchedule'];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
    const item = await QuickQuote.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    Object.assign(item, updates);
    await item.save();
    res.json({ item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await QuickQuote.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Render HTML (preview admin + email body + page publique)
   =========================================================== */
function fmt(n, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}
function fmtBoth(n, primary, secondary, rate) {
  const main = fmt(n, primary);
  if (!secondary || !rate || rate <= 0 || secondary === primary) return main;
  const conv = fmt(n * rate, secondary);
  return `${main} <span style="color:#86868B;font-size:11px;font-weight:400;">(≈ ${conv})</span>`;
}

// Entites emettrices : determine ce qui apparait en bas du devis/facture
// (raison sociale, adresse, numeros legaux, contact). Le choix se fait au niveau du devis.
// @author Rabah Ziane - 2026-05-10
const ISSUERS = {
  fr: {
    legalName: 'DELIVERY Digital Technology',
    address: '470 promenade des Anglais, 06200 Nice, France',
    legalLine: 'SIRET 902 945 195 00029 · RCS Nice · NAF 6201Z · TVA FR 42902945195',
    email: 'contact@deliverydigital.fr',
    phone: '',
    website: 'deliverydigital.fr',
    defaultCurrency: 'EUR',
    defaultTaxRate: 20,
    // RIB seed - surchargeable via BillingSettings admin (Lot 3)
    bank: {
      holderName: 'DELIVERY DIGITAL NICE',
      holderAddress: '470 promenade des Anglais, AIR PROMENADE, 06000 Nice, France',
      iban: 'FR76 1695 8000 0149 1407 4771 772',
      bic: 'QNTOFRP1XXX',
      bankName: 'Qonto',
    },
  },
  ae: {
    legalName: 'DELIVERY DIGITAL TECHNOLOGY - FZCO',
    address: 'Building A1, Dubai Digital Park, Dubai Silicon Oasis, Dubai, UAE',
    legalLine: 'IFZA License N° 45734 · Dubai Integrated Economic Zones Authority',
    email: 'contact@deliverydigital.fr',
    phone: '',
    website: 'deliverydigital.fr',
    defaultCurrency: 'AED',
    defaultTaxRate: 0,
    bank: {
      holderName: 'DELIVERY DIGITAL TECHNOLOGY - FZCO',
      holderAddress: 'Etihad Airways Centre, 5th Floor, Abu Dhabi, UAE',
      iban: 'AE35 0860 0000 0970 5281 381',
      bic: 'WIOBAEADXXX',
      bankName: 'Wio Bank',
    },
  },
};
function getIssuer(quote) {
  return ISSUERS[(quote && quote.issuer) === 'ae' ? 'ae' : 'fr'];
}

// Defaut conditions de paiement : 50 % a la signature / 50 % a la livraison, libelles
// traduits selon la langue du devis. Surchargeable au niveau du devis via quote.paymentSchedule.
// @author Rabah Ziane - 2026-05-11
const DEFAULT_PAYMENT_SCHEDULE_BY_LANG = {
  fr: [{ label: 'Acompte a la signature', percent: 50 }, { label: 'Solde a la livraison', percent: 50 }],
  en: [{ label: 'Deposit on signature', percent: 50 }, { label: 'Balance on delivery', percent: 50 }],
  es: [{ label: 'Anticipo a la firma', percent: 50 }, { label: 'Saldo a la entrega', percent: 50 }],
  de: [{ label: 'Anzahlung bei Unterzeichnung', percent: 50 }, { label: 'Restzahlung bei Lieferung', percent: 50 }],
  it: [{ label: 'Acconto alla firma', percent: 50 }, { label: 'Saldo alla consegna', percent: 50 }],
  pt: [{ label: 'Sinal na assinatura', percent: 50 }, { label: 'Saldo na entrega', percent: 50 }],
  nl: [{ label: 'Aanbetaling bij ondertekening', percent: 50 }, { label: 'Saldo bij levering', percent: 50 }],
  sv: [{ label: 'Handpenning vid undertecknande', percent: 50 }, { label: 'Slutbetalning vid leverans', percent: 50 }],
  da: [{ label: 'Depositum ved underskrift', percent: 50 }, { label: 'Restbeløb ved levering', percent: 50 }],
  no: [{ label: 'Depositum ved signering', percent: 50 }, { label: 'Sluttbetaling ved levering', percent: 50 }],
  fi: [{ label: 'Ennakkomaksu allekirjoituksen yhteydessä', percent: 50 }, { label: 'Loppumaksu toimituksen yhteydessä', percent: 50 }],
  pl: [{ label: 'Zaliczka przy podpisaniu', percent: 50 }, { label: 'Pozostała kwota przy dostawie', percent: 50 }],
  cs: [{ label: 'Záloha při podpisu', percent: 50 }, { label: 'Doplatek při dodání', percent: 50 }],
  hu: [{ label: 'Előleg az aláíráskor', percent: 50 }, { label: 'Végösszeg szállításkor', percent: 50 }],
  el: [{ label: 'Προκαταβολή στην υπογραφή', percent: 50 }, { label: 'Υπόλοιπο κατά την παράδοση', percent: 50 }],
  tr: [{ label: 'İmza sırasında ön ödeme', percent: 50 }, { label: 'Teslimat sırasında bakiye', percent: 50 }],
  ru: [{ label: 'Аванс при подписании', percent: 50 }, { label: 'Окончательный расчёт при поставке', percent: 50 }],
  ar: [{ label: 'دفعة مقدمة عند التوقيع', percent: 50 }, { label: 'الرصيد عند التسليم', percent: 50 }],
  fa: [{ label: 'پیش‌پرداخت هنگام امضا', percent: 50 }, { label: 'تسویه نهایی هنگام تحویل', percent: 50 }],
  hi: [{ label: 'हस्ताक्षर पर अग्रिम भुगतान', percent: 50 }, { label: 'डिलीवरी पर शेष भुगतान', percent: 50 }],
  zh: [{ label: '签约时定金', percent: 50 }, { label: '交付时尾款', percent: 50 }],
  ja: [{ label: '契約時の前払金', percent: 50 }, { label: '納品時の残金', percent: 50 }],
  ko: [{ label: '서명 시 선금', percent: 50 }, { label: '납품 시 잔금', percent: 50 }],
};
function getPaymentSchedule(quote) {
  const lang = (quote && quote.language || 'fr').toLowerCase();
  const defaults = DEFAULT_PAYMENT_SCHEDULE_BY_LANG[lang] || DEFAULT_PAYMENT_SCHEDULE_BY_LANG.fr;
  const sch = (quote && Array.isArray(quote.paymentSchedule) && quote.paymentSchedule.length > 0)
    ? quote.paymentSchedule
    : defaults;
  // Filtrer les entrees vides
  return sch.filter((s) => s && s.percent > 0 && s.label);
}

const LABELS = {
  fr: { quote: 'Devis', emittedOn: 'Émis le', validUntil: 'Valable jusqu\'au', to: 'À l\'attention de', service: 'Prestation', qty: 'Quantité', unitPrice: 'Prix unitaire', totalHt: 'Total HT', subtotal: 'Sous-total HT', discount: 'Réduction', subtotalAfterDiscount: 'Sous-total après remise', tax: 'TVA', totalTtc: 'Total TTC', cii: '↓ Crédit Impôt Innovation', ciiNet: 'Coût net après CII', paymentTermsTitle: 'Conditions de paiement', replyCta: 'Répondre à ce devis', subject: (ref) => `Votre devis ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>Crédit Impôt Innovation (CII)</strong> - DELIVERY Digital est certifié CII. Pour les PME françaises éligibles, ${amount > 0 ? `<strong>${fmt}</strong> seront récupérés` : '20 % des dépenses d\'innovation seront récupérés'} via ce dispositif fiscal (plafond annuel : 400 000 € de dépenses, soit 80 000 € de crédit max).` },
  en: { quote: 'Quote', emittedOn: 'Issued on', validUntil: 'Valid until', to: 'For', service: 'Service', qty: 'Quantity', unitPrice: 'Unit price', totalHt: 'Total (excl. tax)', subtotal: 'Subtotal (excl. tax)', discount: 'Discount', subtotalAfterDiscount: 'Subtotal after discount', tax: 'VAT', totalTtc: 'Total (incl. tax)', cii: '↓ French Innovation Tax Credit (CII)', ciiNet: 'Net cost after tax credit', paymentTermsTitle: 'Payment terms', replyCta: 'Reply to this quote', subject: (ref) => `Your quote ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>French Innovation Tax Credit (CII)</strong> - DELIVERY Digital is CII-certified. Eligible French SMEs can recover ${amount > 0 ? `<strong>${fmt}</strong>` : '20 % of innovation expenses'} via this tax mechanism (yearly cap: 400,000 EUR of eligible expenses, max 80,000 EUR credit).` },
  es: { quote: 'Presupuesto', emittedOn: 'Emitido el', validUntil: 'Válido hasta', to: 'Para', service: 'Servicio', qty: 'Cantidad', unitPrice: 'Precio unitario', totalHt: 'Total (sin IVA)', subtotal: 'Subtotal (sin IVA)', discount: 'Descuento', subtotalAfterDiscount: 'Subtotal después del descuento', tax: 'IVA', totalTtc: 'Total (con IVA)', cii: '↓ Crédito fiscal francés CII', ciiNet: 'Coste neto tras crédito', paymentTermsTitle: 'Condiciones de pago', replyCta: 'Responder a esta cotización', subject: (ref) => `Su presupuesto ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>Crédito fiscal CII (Francia)</strong> - DELIVERY Digital está certificado CII. Las PYMEs francesas elegibles recuperan ${amount > 0 ? `<strong>${fmt}</strong>` : '20 %'} a través de este dispositivo fiscal (límite anual : 400 000 EUR de gastos elegibles).` },
  de: { quote: 'Angebot', emittedOn: 'Ausgestellt am', validUntil: 'Gültig bis', to: 'Zu Händen', service: 'Leistung', qty: 'Menge', unitPrice: 'Einzelpreis', totalHt: 'Gesamt (netto)', subtotal: 'Zwischensumme (netto)', discount: 'Rabatt', subtotalAfterDiscount: 'Zwischensumme nach Rabatt', tax: 'MwSt.', totalTtc: 'Gesamt (brutto)', cii: '↓ Franz. Innovations-Steuergutschrift (CII)', ciiNet: 'Nettokosten nach Steuergutschrift', paymentTermsTitle: 'Zahlungsbedingungen', replyCta: 'Auf dieses Angebot antworten', subject: (ref) => `Ihr Angebot ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>Französische Innovations-Steuergutschrift (CII)</strong> - DELIVERY Digital ist CII-zertifiziert. Förderfähige französische KMU erhalten ${amount > 0 ? `<strong>${fmt}</strong>` : '20 %'} der Innovationsausgaben zurück.` },
  it: { quote: 'Preventivo', emittedOn: 'Emesso il', validUntil: 'Valido fino al', to: 'Per', service: 'Servizio', qty: 'Quantità', unitPrice: 'Prezzo unitario', totalHt: 'Totale (escl. IVA)', subtotal: 'Subtotale (escl. IVA)', discount: 'Sconto', subtotalAfterDiscount: 'Subtotale dopo sconto', tax: 'IVA', totalTtc: 'Totale (incl. IVA)', cii: '↓ Credito d\'imposta francese CII', ciiNet: 'Costo netto dopo credito', paymentTermsTitle: 'Condizioni di pagamento', replyCta: 'Rispondi a questo preventivo', subject: (ref) => `Il tuo preventivo ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>Credito d'imposta CII (Francia)</strong> - DELIVERY Digital è certificata CII.` },
  pt: { quote: 'Orçamento', emittedOn: 'Emitido em', validUntil: 'Válido até', to: 'Para', service: 'Serviço', qty: 'Quantidade', unitPrice: 'Preço unitário', totalHt: 'Total (sem IVA)', subtotal: 'Subtotal (sem IVA)', discount: 'Desconto', subtotalAfterDiscount: 'Subtotal após desconto', tax: 'IVA', totalTtc: 'Total (com IVA)', cii: '↓ Crédito fiscal francês CII', ciiNet: 'Custo líquido após crédito', paymentTermsTitle: 'Condições de pagamento', replyCta: 'Responder a este orçamento', subject: (ref) => `O seu orçamento ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  nl: { quote: 'Offerte', emittedOn: 'Uitgegeven op', validUntil: 'Geldig tot', to: 'T.a.v.', service: 'Dienst', qty: 'Aantal', unitPrice: 'Stukprijs', totalHt: 'Totaal (excl. btw)', subtotal: 'Subtotaal (excl. btw)', discount: 'Korting', subtotalAfterDiscount: 'Subtotaal na korting', tax: 'Btw', totalTtc: 'Totaal (incl. btw)', cii: '↓ Frans innovatiebelastingvoordeel (CII)', ciiNet: 'Nettokosten na belastingvoordeel', paymentTermsTitle: 'Betalingsvoorwaarden', replyCta: 'Antwoord op deze offerte', subject: (ref) => `Uw offerte ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  sv: { quote: 'Offert', emittedOn: 'Utfärdat den', validUntil: 'Giltig till', to: 'Att.', service: 'Tjänst', qty: 'Antal', unitPrice: 'Á-pris', totalHt: 'Totalt (exkl. moms)', subtotal: 'Delsumma (exkl. moms)', discount: 'Rabatt', subtotalAfterDiscount: 'Delsumma efter rabatt', tax: 'Moms', totalTtc: 'Totalt (inkl. moms)', cii: '↓ Franska innovationsskattelättnad (CII)', ciiNet: 'Nettokostnad efter skattelättnad', paymentTermsTitle: 'Betalningsvillkor', replyCta: 'Svara på denna offert', subject: (ref) => `Din offert ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  da: { quote: 'Tilbud', emittedOn: 'Udstedt den', validUntil: 'Gyldig indtil', to: 'Att.', service: 'Ydelse', qty: 'Antal', unitPrice: 'Enhedspris', totalHt: 'I alt (ekskl. moms)', subtotal: 'Subtotal (ekskl. moms)', discount: 'Rabat', subtotalAfterDiscount: 'Subtotal efter rabat', tax: 'Moms', totalTtc: 'I alt (inkl. moms)', cii: '↓ Fransk innovationsskattekredit (CII)', ciiNet: 'Nettoomkostning efter skattekredit', paymentTermsTitle: 'Betalingsbetingelser', replyCta: 'Svar på dette tilbud', subject: (ref) => `Dit tilbud ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  no: { quote: 'Tilbud', emittedOn: 'Utstedt', validUntil: 'Gyldig til', to: 'Att.', service: 'Tjeneste', qty: 'Antall', unitPrice: 'Enhetspris', totalHt: 'Totalt (eks. mva)', subtotal: 'Subtotal (eks. mva)', discount: 'Rabatt', subtotalAfterDiscount: 'Subtotal etter rabatt', tax: 'Mva', totalTtc: 'Totalt (inkl. mva)', cii: '↓ Fransk innovasjonsskattekreditt (CII)', ciiNet: 'Nettokostnad etter skattekreditt', paymentTermsTitle: 'Betalingsbetingelser', replyCta: 'Svar på dette tilbudet', subject: (ref) => `Tilbudet ditt ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  fi: { quote: 'Tarjous', emittedOn: 'Päivätty', validUntil: 'Voimassa', to: 'Vastaanottaja', service: 'Palvelu', qty: 'Määrä', unitPrice: 'Yksikköhinta', totalHt: 'Yhteensä (alv 0%)', subtotal: 'Välisumma (alv 0%)', discount: 'Alennus', subtotalAfterDiscount: 'Välisumma alennuksen jälkeen', tax: 'ALV', totalTtc: 'Yhteensä (alv mukaan luettuna)', cii: '↓ Ranskan innovaatioverohyvitys (CII)', ciiNet: 'Nettokustannus verohyvityksen jälkeen', paymentTermsTitle: 'Maksuehdot', replyCta: 'Vastaa tähän tarjoukseen', subject: (ref) => `Tarjouksesi ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  pl: { quote: 'Wycena', emittedOn: 'Wystawiono dnia', validUntil: 'Ważne do', to: 'Do rąk', service: 'Usługa', qty: 'Ilość', unitPrice: 'Cena jednostkowa', totalHt: 'Razem (netto)', subtotal: 'Suma częściowa (netto)', discount: 'Rabat', subtotalAfterDiscount: 'Suma częściowa po rabacie', tax: 'VAT', totalTtc: 'Razem (brutto)', cii: '↓ Francuska ulga podatkowa na innowacje (CII)', ciiNet: 'Koszt netto po uldze', paymentTermsTitle: 'Warunki płatności', replyCta: 'Odpowiedz na tę wycenę', subject: (ref) => `Twoja wycena ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  cs: { quote: 'Cenová nabídka', emittedOn: 'Vystaveno dne', validUntil: 'Platnost do', to: 'K rukám', service: 'Služba', qty: 'Množství', unitPrice: 'Cena za jednotku', totalHt: 'Celkem (bez DPH)', subtotal: 'Mezisoučet (bez DPH)', discount: 'Sleva', subtotalAfterDiscount: 'Mezisoučet po slevě', tax: 'DPH', totalTtc: 'Celkem (s DPH)', cii: '↓ Francouzský daňový kredit na inovace (CII)', ciiNet: 'Čisté náklady po daňovém kreditu', paymentTermsTitle: 'Platební podmínky', replyCta: 'Odpovědět na tuto nabídku', subject: (ref) => `Vaše cenová nabídka ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  hu: { quote: 'Árajánlat', emittedOn: 'Kiállítva', validUntil: 'Érvényes', to: 'Címzett', service: 'Szolgáltatás', qty: 'Mennyiség', unitPrice: 'Egységár', totalHt: 'Összesen (nettó)', subtotal: 'Részösszeg (nettó)', discount: 'Kedvezmény', subtotalAfterDiscount: 'Részösszeg kedvezmény után', tax: 'ÁFA', totalTtc: 'Összesen (bruttó)', cii: '↓ Francia innovációs adójóváírás (CII)', ciiNet: 'Nettó költség adójóváírás után', paymentTermsTitle: 'Fizetési feltételek', replyCta: 'Válasz erre az ajánlatra', subject: (ref) => `Az árajánlata ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  el: { quote: 'Προσφορά', emittedOn: 'Εκδόθηκε στις', validUntil: 'Ισχύει έως', to: 'Προς', service: 'Υπηρεσία', qty: 'Ποσότητα', unitPrice: 'Τιμή μονάδας', totalHt: 'Σύνολο (χωρίς ΦΠΑ)', subtotal: 'Μερικό σύνολο (χωρίς ΦΠΑ)', discount: 'Έκπτωση', subtotalAfterDiscount: 'Μερικό σύνολο μετά την έκπτωση', tax: 'ΦΠΑ', totalTtc: 'Σύνολο (με ΦΠΑ)', cii: '↓ Γαλλική φορολογική πίστωση καινοτομίας (CII)', ciiNet: 'Καθαρό κόστος μετά την πίστωση', paymentTermsTitle: 'Όροι πληρωμής', replyCta: 'Απάντηση σε αυτή την προσφορά', subject: (ref) => `Η προσφορά σας ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  tr: { quote: 'Teklif', emittedOn: 'Düzenleme tarihi', validUntil: 'Geçerlilik', to: 'Sayın', service: 'Hizmet', qty: 'Miktar', unitPrice: 'Birim fiyat', totalHt: 'Toplam (KDV hariç)', subtotal: 'Ara toplam (KDV hariç)', discount: 'İndirim', subtotalAfterDiscount: 'İndirim sonrası ara toplam', tax: 'KDV', totalTtc: 'Toplam (KDV dahil)', cii: '↓ Fransız inovasyon vergi kredisi (CII)', ciiNet: 'Vergi kredisi sonrası net maliyet', paymentTermsTitle: 'Ödeme koşulları', replyCta: 'Bu teklife yanıt verin', subject: (ref) => `Teklifiniz ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  ru: { quote: 'Коммерческое предложение', emittedOn: 'Выдано', validUntil: 'Действительно до', to: 'Кому', service: 'Услуга', qty: 'Кол-во', unitPrice: 'Цена за ед.', totalHt: 'Итого (без НДС)', subtotal: 'Промежуточный итог (без НДС)', discount: 'Скидка', subtotalAfterDiscount: 'Промежуточный итог после скидки', tax: 'НДС', totalTtc: 'Итого (с НДС)', cii: '↓ Французский налоговый кредит на инновации (CII)', ciiNet: 'Чистая стоимость после налогового кредита', paymentTermsTitle: 'Условия оплаты', replyCta: 'Ответить на это предложение', subject: (ref) => `Ваше предложение ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  ar: { quote: 'عرض سعر', emittedOn: 'تاريخ الإصدار', validUntil: 'صالح حتى', to: 'إلى', service: 'الخدمة', qty: 'الكمية', unitPrice: 'سعر الوحدة', totalHt: 'الإجمالي (بدون ضريبة)', subtotal: 'الإجمالي الفرعي (بدون ضريبة)', discount: 'خصم', subtotalAfterDiscount: 'الإجمالي الفرعي بعد الخصم', tax: 'ضريبة القيمة المضافة', totalTtc: 'الإجمالي (شامل الضريبة)', cii: '↓ الائتمان الضريبي الفرنسي للابتكار (CII)', ciiNet: 'التكلفة الصافية بعد الائتمان الضريبي', paymentTermsTitle: 'شروط الدفع', replyCta: 'الرد على عرض السعر هذا', subject: (ref) => `عرض السعر الخاص بك ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  fa: { quote: 'پیش‌فاکتور', emittedOn: 'تاریخ صدور', validUntil: 'معتبر تا', to: 'به', service: 'خدمت', qty: 'تعداد', unitPrice: 'قیمت واحد', totalHt: 'جمع (بدون مالیات)', subtotal: 'جمع جزئی (بدون مالیات)', discount: 'تخفیف', subtotalAfterDiscount: 'جمع جزئی پس از تخفیف', tax: 'مالیات بر ارزش افزوده', totalTtc: 'جمع (با مالیات)', cii: '↓ اعتبار مالیاتی نوآوری فرانسه (CII)', ciiNet: 'هزینه خالص پس از اعتبار مالیاتی', paymentTermsTitle: 'شرایط پرداخت', replyCta: 'پاسخ به این پیش‌فاکتور', subject: (ref) => `پیش‌فاکتور شما ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  hi: { quote: 'कोटेशन', emittedOn: 'जारी किया गया', validUntil: 'मान्य अंतिम तिथि', to: 'प्रति', service: 'सेवा', qty: 'मात्रा', unitPrice: 'इकाई मूल्य', totalHt: 'कुल (कर रहित)', subtotal: 'उप-योग (कर रहित)', discount: 'छूट', subtotalAfterDiscount: 'छूट के बाद उप-योग', tax: 'वैट', totalTtc: 'कुल (कर सहित)', cii: '↓ फ्रेंच इनोवेशन टैक्स क्रेडिट (CII)', ciiNet: 'टैक्स क्रेडिट के बाद शुद्ध लागत', paymentTermsTitle: 'भुगतान शर्तें', replyCta: 'इस कोटेशन का उत्तर दें', subject: (ref) => `आपका कोटेशन ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  zh: { quote: '报价单', emittedOn: '签发日期', validUntil: '有效期至', to: '收件人', service: '服务项目', qty: '数量', unitPrice: '单价', totalHt: '总计（不含税）', subtotal: '小计（不含税）', discount: '折扣', subtotalAfterDiscount: '折扣后小计', tax: '增值税', totalTtc: '总计（含税）', cii: '↓ 法国创新税收抵免 (CII)', ciiNet: '税收抵免后净成本', paymentTermsTitle: '付款条件', replyCta: '回复此报价单', subject: (ref) => `您的报价单 ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  ja: { quote: '見積書', emittedOn: '発行日', validUntil: '有効期限', to: '宛先', service: 'サービス', qty: '数量', unitPrice: '単価', totalHt: '合計（税抜）', subtotal: '小計（税抜）', discount: '割引', subtotalAfterDiscount: '割引後小計', tax: '消費税', totalTtc: '合計（税込）', cii: '↓ フランスのイノベーション税額控除 (CII)', ciiNet: '税額控除後の正味コスト', paymentTermsTitle: 'お支払い条件', replyCta: 'この見積もりに返信', subject: (ref) => `お見積もり ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
  ko: { quote: '견적서', emittedOn: '발행일', validUntil: '유효 기한', to: '받는 분', service: '서비스', qty: '수량', unitPrice: '단가', totalHt: '합계 (부가세 별도)', subtotal: '소계 (부가세 별도)', discount: '할인', subtotalAfterDiscount: '할인 후 소계', tax: '부가세', totalTtc: '합계 (부가세 포함)', cii: '↓ 프랑스 혁신 세금 공제 (CII)', ciiNet: '세금 공제 후 순 비용', paymentTermsTitle: '결제 조건', replyCta: '이 견적에 답장하기', subject: (ref) => `귀하의 견적서 ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
};

function getLabels(lang) {
  return LABELS[(lang || 'fr').toLowerCase()] || LABELS.fr;
}

function renderHtml(quote, { publicView = false } = {}) {
  const lang = (quote.language || 'fr').toLowerCase();
  const L = getLabels(lang);
  const ISS = getIssuer(quote);
  const PSCH = getPaymentSchedule(quote);
  const dateLocale = getDateLocale(lang);
  const dir = (['ar','fa'].includes(lang)) ? 'rtl' : 'ltr';
  const validDate = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString(dateLocale) : '';
  const today = new Date().toLocaleDateString(dateLocale);
  const publicLink = `${PUBLIC_BASE}/devis/${quote.publicToken}`;
  const cur = (quote.currency || 'EUR').toUpperCase();
  const sec = quote.secondaryCurrency ? quote.secondaryCurrency.toUpperCase() : null;
  const rate = quote.secondaryRate || 1;
  const M = (n) => fmtBoth(n, cur, sec, rate);

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${L.quote} ${quote.ref} - DELIVERY Digital</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif; background: #F2EFE9; color: #1D1D1F; margin: 0; padding: 0; }
  .wrap { max-width: 760px; margin: 0 auto; background: #fff; padding: 40px 48px; box-shadow: 0 8px 30px -8px rgba(0,0,0,0.08); }
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 30px; border-bottom: 1px solid #E5E5EA; margin-bottom: 30px; }
  .header img { height: 38px; }
  .meta { text-align: right; font-size: 13px; color: #86868B; line-height: 1.6; }
  .meta strong { color: #1D1D1F; font-weight: 600; }
  h1 { font-family: "Charter", "Iowan Old Style", Georgia, serif; font-weight: 700; font-size: 30px; line-height: 1.1; margin: 10px 0 8px; }
  .ref { font-size: 13px; color: #86868B; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600; }
  .client-block { background: #F5F5F7; border-radius: 14px; padding: 20px; margin: 24px 0; }
  .client-block .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #86868B; font-weight: 600; margin-bottom: 4px; }
  .client-block .name { font-size: 16px; font-weight: 600; color: #1D1D1F; }
  .client-block .info { font-size: 13px; color: #86868B; margin-top: 4px; }
  .intro { font-size: 15px; line-height: 1.6; color: #1D1D1F; margin: 24px 0; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #86868B; font-weight: 600; padding: 10px 12px; border-bottom: 1px solid #E5E5EA; }
  td { padding: 14px 12px; border-bottom: 1px solid #F2F2F7; font-size: 14px; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; tabular-nums: true; }
  .desc-main { font-weight: 600; color: #1D1D1F; }
  .desc-details { color: #86868B; font-size: 12.5px; margin-top: 3px; }
  .totals { margin-top: 18px; margin-left: auto; width: 320px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .totals .row.big { border-top: 2px solid #1D1D1F; margin-top: 8px; padding-top: 14px; font-size: 17px; font-weight: 700; }
  .totals .row.cii { color: #34C759; font-weight: 600; }
  .cii-block { background: #F2EFE9; border-radius: 14px; padding: 16px 20px; margin: 24px 0; font-size: 13px; line-height: 1.5; color: #1D1D1F; }
  .cii-block strong { color: #1D1D1F; }
  .notes { font-size: 13px; color: #86868B; line-height: 1.6; margin: 30px 0; padding: 16px 20px; border-left: 3px solid #1D1D1F; background: #FAFAFA; border-radius: 0 8px 8px 0; }
  .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #E5E5EA; font-size: 11.5px; color: #86868B; line-height: 1.6; text-align: center; }
  .cta { text-align: center; margin: 30px 0; }
  .cta a { display: inline-block; padding: 12px 28px; background: #1D1D1F; color: #fff; text-decoration: none; border-radius: 999px; font-weight: 600; font-size: 14px; }
  /* Mobile : reduire padding + colonnes pour eviter horizontal overflow. Conserve le design. */
  @media (max-width: 600px) {
    .wrap { padding: 24px 16px; box-shadow: none; }
    .header { flex-direction: column; align-items: flex-start; gap: 14px; padding-bottom: 20px; margin-bottom: 20px; }
    .header img { height: 30px; }
    .meta { text-align: left; }
    h1 { font-size: 24px; }
    table th { font-size: 10px; padding: 8px 4px; letter-spacing: 0.04em; }
    table td { padding: 10px 4px; font-size: 12.5px; }
    table th[style*="80px"], table th[style*="120px"] { width: auto !important; }
    .totals { width: 100% !important; margin-left: 0; }
    .totals .row { font-size: 13px; }
    .totals .row.big { font-size: 15px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <img src="${LOGO_URL}" alt="DELIVERY Digital" />
    <div class="meta">
      <div class="ref">${L.quote} ${quote.ref}</div>
      <div>${L.emittedOn} <strong>${today}</strong></div>
      ${validDate ? `<div>${L.validUntil} <strong>${validDate}</strong></div>` : ''}
    </div>
  </div>

  <h1>${escapeHtml(quote.title || 'Devis')}</h1>

  <div class="client-block">
    <div class="label">${L.to}</div>
    <div class="name">${escapeHtml(quote.client?.name || '')}</div>
    <div class="info">
      ${quote.client?.company ? escapeHtml(quote.client.company) + '<br/>' : ''}
      ${quote.client?.email ? escapeHtml(quote.client.email) : ''}
      ${quote.client?.phone ? ' · ' + escapeHtml(quote.client.phone) : ''}
    </div>
  </div>

  ${quote.intro ? `<div class="intro">${escapeHtml(quote.intro).replace(/\n/g, '<br/>')}</div>` : ''}

  <table>
    <thead>
      <tr>
        <th style="width:50%">${L.service}</th>
        <th class="num" style="width:80px">${L.qty}</th>
        <th class="num" style="width:120px">${L.unitPrice}</th>
        <th class="num" style="width:120px">${L.totalHt}</th>
      </tr>
    </thead>
    <tbody>
      ${(quote.lines || []).map((l) => `
        <tr>
          <td>
            <div class="desc-main">${escapeHtml(l.description)}</div>
            ${l.details ? `<div class="desc-details">${escapeHtml(l.details)}</div>` : ''}
          </td>
          <td class="num">${l.quantity} ${l.unit ? escapeHtml(l.unit) : ''}</td>
          <td class="num">${M(l.unitPrice)}</td>
          <td class="num"><strong>${M((l.quantity || 1) * (l.unitPrice || 0))}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>${L.subtotal}</span><strong>${M(quote.subtotal)}</strong></div>
    ${quote.discountAmount > 0 ? `
      <div class="row" style="color:#FF9500"><span>${L.discount}${quote.discountType === 'percent' ? ' (' + quote.discountValue + ' %)' : ''}</span><span>-${M(quote.discountAmount)}</span></div>
      <div class="row"><span>${L.subtotalAfterDiscount}</span><strong>${M(quote.subtotalAfterDiscount)}</strong></div>
    ` : ''}
    <div class="row"><span>${L.tax} (${quote.taxRate} %)</span><span>${M(quote.taxAmount)}</span></div>
    <div class="row big"><span>${L.totalTtc}</span><span>${M(quote.totalTTC)}</span></div>
    ${quote.ciiEligible && quote.ciiAmount > 0 ? `
      <div class="row cii"><span>${L.cii}</span><span>-${M(quote.ciiAmount)}</span></div>
      <div class="row big"><span>${L.ciiNet}</span><span>${M(quote.totalTTC - quote.ciiAmount)}</span></div>
    ` : ''}
  </div>

  ${quote.ciiEligible ? `
    <div class="cii-block">
      ${L.ciiBlock(quote.ciiAmount, M(quote.ciiAmount))}
    </div>
  ` : ''}

  ${PSCH.length > 0 ? `
    <div style="margin:24px 0;padding:16px 20px;background:#F5F5F7;border-radius:14px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#86868B;font-weight:600;margin-bottom:8px;">${L.paymentTermsTitle}</div>
      <ul style="margin:0;padding:0;list-style:none;">
        ${PSCH.map((s) => `
          <li style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13.5px;color:#1D1D1F;border-bottom:1px solid #E5E5EA;">
            <span>${escapeHtml(s.label)}</span>
            <span style="font-weight:600;">${s.percent} % - ${M((quote.totalTTC || 0) * (s.percent / 100))}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  ` : ''}

  ${quote.notes ? `<div class="notes">${escapeHtml(quote.notes).replace(/\n/g, '<br/>')}</div>` : ''}

  ${publicView ? renderAcceptanceBlock(quote, L, lang) : ''}

  <div class="footer">
    ${escapeHtml(ISS.legalName)} · ${escapeHtml(ISS.address)}<br/>
    ${escapeHtml(ISS.legalLine)}<br/>
    ${escapeHtml(ISS.email)}${ISS.phone ? ' · ' + escapeHtml(ISS.phone) : ''} · ${escapeHtml(ISS.website)}
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Calcule les montants d'acompte (HT, TVA, TTC) + meta (refs, dates, RIB) pour la facture.
// Centralise pour qu'HTML et PDF restent coherents.
// @author Rabah Ziane - 2026-05-11
function buildDepositInvoiceData(quote) {
  const lang = (quote.language || 'fr').toLowerCase();
  const ISS = getIssuer(quote);
  const PSCH = getPaymentSchedule(quote);
  const acompte = PSCH[0] || { label: 'Acompte a la signature', percent: 50 };
  const totalTTC = quote.totalTTC || 0;
  const amount = Math.round(totalTTC * (acompte.percent / 100) * 100) / 100;
  const tvaRate = quote.taxRate || 0;
  const amountHT = tvaRate > 0 ? Math.round(amount / (1 + tvaRate / 100) * 100) / 100 : amount;
  const amountTVA = Math.round((amount - amountHT) * 100) / 100;
  const dateLocale = getDateLocale(lang);
  return {
    lang, ISS, acompte,
    invoiceRef: (quote.ref || '').replace(/^DDQ-/, 'DDF-') || `DDF-${Date.now()}`,
    today: new Date().toLocaleDateString(dateLocale),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(dateLocale),
    amount, amountHT, amountTVA, tvaRate,
    currency: (quote.currency || 'EUR').toUpperCase(),
    bank: ISS.bank || {},
  };
}

// Genere un PDF natif de la facture d'acompte via pdfkit (pas de HTML/puppeteer, leger et stable).
// Retourne un Buffer prêt a être attache au mail.
// @author Rabah Ziane - 2026-05-11
// Polices Helvetica de pdfkit = scripts latins uniquement. Pour ar/fa/hi/zh/ja/ko/ru/el/...
// on retombe sur EN dans le PDF (mais l'email HTML reste dans la langue du client).
// @author Rabah Ziane - 2026-05-11
const LATIN_PDF_LANGS = new Set(['fr','en','es','de','it','pt','nl','sv','da','no','fi','pl','cs','hu','tr']);
function getPdfLang(lang) {
  const l = (lang || 'fr').toLowerCase();
  return LATIN_PDF_LANGS.has(l) ? l : 'en';
}

function renderDepositInvoicePdf(quote) {
  return new Promise((resolve, reject) => {
    try {
      const D = buildDepositInvoiceData(quote);
      const pdfLang = getPdfLang(D.lang);
      const DL = getDepositLabels(pdfLang);
      const intlLocale = getDateLocale(pdfLang);
      const formatMoney = (n) => {
        try { return new Intl.NumberFormat(intlLocale, { style: 'currency', currency: D.currency, minimumFractionDigits: 2 }).format(n); }
        catch { return `${n.toFixed(2)} ${D.currency}`; }
      };

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: { Title: `${DL.invoice} ${D.invoiceRef}`, Author: 'DELIVERY Digital', Subject: `${DL.invoiceTitle} ${D.invoiceRef}` },
      });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;

      // En-tete : logo a gauche (meme design que le devis) + meta facture a droite
      if (fs.existsSync(LOGO_FILE_PATH)) {
        try { doc.image(LOGO_FILE_PATH, left, 45, { height: 32 }); }
        catch (e) { doc.fillColor('#1D1D1F').font('Helvetica-Bold').fontSize(18).text('DELIVERY Digital', left, 50); }
      } else {
        doc.fillColor('#1D1D1F').font('Helvetica-Bold').fontSize(18).text('DELIVERY Digital', left, 50);
      }
      doc.font('Helvetica').fontSize(9).fillColor('#86868B')
        .text(`${DL.invoice.toUpperCase()} ${D.invoiceRef}`, right - 200, 52, { width: 200, align: 'right' })
        .text(`${DL.issuedOn} ${D.today}`, { width: 200, align: 'right' })
        .text(`${DL.dueDate} ${D.dueDate}`, { width: 200, align: 'right' })
        .text(`${DL.relatedQuote} : ${quote.ref || ''}`, { width: 200, align: 'right' });

      doc.moveTo(left, 110).lineTo(right, 110).strokeColor('#E5E5EA').lineWidth(0.5).stroke();

      // Titre
      doc.fillColor('#1D1D1F').font('Helvetica-Bold').fontSize(24).text(DL.invoiceTitle, left, 130);

      // Bloc client
      const clientY = 175;
      doc.rect(left, clientY, W, 60).fillColor('#F5F5F7').fill();
      doc.fillColor('#86868B').font('Helvetica-Bold').fontSize(8).text(DL.to.toUpperCase(), left + 14, clientY + 12);
      doc.fillColor('#1D1D1F').font('Helvetica-Bold').fontSize(13).text(quote.client?.name || '', left + 14, clientY + 26);
      const subline = [quote.client?.company, quote.client?.email, quote.client?.phone].filter(Boolean).join(' · ');
      doc.fillColor('#86868B').font('Helvetica').fontSize(10).text(subline, left + 14, clientY + 45, { width: W - 28 });

      // Tableau prestation
      let y = clientY + 90;
      doc.fillColor('#86868B').font('Helvetica-Bold').fontSize(8)
        .text(DL.service.toUpperCase(), left, y)
        .text(DL.amountHt.toUpperCase(), right - 120, y, { width: 120, align: 'right' });
      y += 14;
      doc.moveTo(left, y).lineTo(right, y).strokeColor('#E5E5EA').lineWidth(0.5).stroke();
      y += 12;

      doc.fillColor('#1D1D1F').font('Helvetica-Bold').fontSize(12).text(D.acompte.label, left, y);
      doc.fillColor('#86868B').font('Helvetica').fontSize(10).text(
        DL.percentOf(D.acompte.percent, quote.title, quote.ref),
        left, y + 16, { width: W - 130 }
      );
      doc.fillColor('#1D1D1F').font('Helvetica-Bold').fontSize(12).text(formatMoney(D.amountHT), right - 120, y, { width: 120, align: 'right' });
      y += 50;
      doc.moveTo(left, y).lineTo(right, y).strokeColor('#F2F2F7').lineWidth(0.5).stroke();
      y += 18;

      // Totaux (alignes a droite)
      const totalsX = right - 220;
      const totalsW = 220;
      const drawRow = (label, value, bold = false) => {
        doc.fillColor('#1D1D1F').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 13 : 11)
          .text(label, totalsX, y)
          .text(value, totalsX, y, { width: totalsW, align: 'right' });
        y += bold ? 20 : 16;
      };
      drawRow(DL.subtotalHt, formatMoney(D.amountHT));
      drawRow(`${DL.tax} (${D.tvaRate} %)`, formatMoney(D.amountTVA));
      doc.moveTo(totalsX, y + 2).lineTo(right, y + 2).strokeColor('#1D1D1F').lineWidth(1).stroke();
      y += 10;
      drawRow(DL.netToPay, formatMoney(D.amount), true);
      y += 10;

      // RIB
      if (D.bank.iban) {
        doc.rect(left, y, W, 95).fillColor('#F5F5F7').fill();
        doc.fillColor('#86868B').font('Helvetica-Bold').fontSize(8).text(DL.bankDetails.toUpperCase(), left + 14, y + 12);
        let ry = y + 28;
        const ribRow = (k, v, mono = false) => {
          doc.fillColor('#86868B').font('Helvetica').fontSize(10).text(k, left + 14, ry, { width: 110 });
          doc.fillColor('#1D1D1F').font(mono ? 'Courier' : 'Helvetica-Bold').fontSize(10).text(v, left + 130, ry, { width: W - 144 });
          ry += 14;
        };
        ribRow(DL.beneficiary, D.bank.holderName || '');
        if (D.bank.bankName) ribRow(DL.bank, D.bank.bankName);
        ribRow('IBAN', D.bank.iban, true);
        if (D.bank.bic) ribRow(DL.bicSwift, D.bank.bic, true);
        doc.fillColor('#86868B').font('Helvetica').fontSize(8.5)
          .text(`${DL.txRef} : ${D.invoiceRef}`, left + 14, y + 80);
        y += 110;
      }

      // Footer ISS sans telephone
      const footY = doc.page.height - 70;
      doc.moveTo(left, footY).lineTo(right, footY).strokeColor('#E5E5EA').lineWidth(0.5).stroke();
      doc.fillColor('#86868B').font('Helvetica').fontSize(8).text(`${D.ISS.legalName} · ${D.ISS.address}`, left, footY + 8, { width: W, align: 'center' });
      doc.text(D.ISS.legalLine, { width: W, align: 'center' });
      const footLine = [D.ISS.email, D.ISS.phone, D.ISS.website].filter(Boolean).join(' · ');
      doc.text(footLine, { width: W, align: 'center' });

      doc.end();
    } catch (e) { reject(e); }
  });
}

// Facture d'acompte auto-generee a l'acceptation du devis.
// Reprend le 1er item du paymentSchedule (typiquement 50%) comme montant a payer.
// Numero facture : DDF-{annee}-{seq devis} (ex: devis DDQ-2026-3515 -> facture DDF-2026-3515).
// HTML inline pour le mail, meme style que le devis. Pas de PDF.
// @author Rabah Ziane - 2026-05-11
function renderDepositInvoiceHtml(quote) {
  const lang = (quote.language || 'fr').toLowerCase();
  const L = getLabels(lang);
  const DL = getDepositLabels(lang);
  const ISS = getIssuer(quote);
  const PSCH = getPaymentSchedule(quote);
  const cur = (quote.currency || 'EUR').toUpperCase();
  const sec = quote.secondaryCurrency ? quote.secondaryCurrency.toUpperCase() : null;
  const rate = quote.secondaryRate || 1;
  const M = (n) => fmtBoth(n, cur, sec, rate);
  const dateLocale = getDateLocale(lang);
  const dir = (['ar','fa'].includes(lang)) ? 'rtl' : 'ltr';

  const acompte = PSCH[0] || { label: 'Acompte a la signature', percent: 50 };
  const totalTTC = quote.totalTTC || 0;
  const amount = Math.round(totalTTC * (acompte.percent / 100) * 100) / 100;
  const tvaRate = quote.taxRate || 0;
  const amountHT = tvaRate > 0 ? Math.round(amount / (1 + tvaRate / 100) * 100) / 100 : amount;
  const amountTVA = Math.round((amount - amountHT) * 100) / 100;

  const invoiceRef = (quote.ref || '').replace(/^DDQ-/, 'DDF-') || `DDF-${Date.now()}`;
  const today = new Date().toLocaleDateString(dateLocale);
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(dateLocale);
  const bank = ISS.bank || {};

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${DL.invoice} ${invoiceRef} - DELIVERY Digital</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif; background: #F2EFE9; color: #1D1D1F; margin: 0; padding: 0; }
  .wrap { max-width: 760px; margin: 0 auto; background: #fff; padding: 40px 48px; box-shadow: 0 8px 30px -8px rgba(0,0,0,0.08); }
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 30px; border-bottom: 1px solid #E5E5EA; margin-bottom: 30px; }
  .header img { height: 38px; }
  .meta { text-align: right; font-size: 13px; color: #86868B; line-height: 1.6; }
  .meta strong { color: #1D1D1F; font-weight: 600; }
  h1 { font-family: "Charter", "Iowan Old Style", Georgia, serif; font-weight: 700; font-size: 30px; line-height: 1.1; margin: 10px 0 8px; }
  .ref { font-size: 13px; color: #86868B; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600; }
  .client-block { background: #F5F5F7; border-radius: 14px; padding: 20px; margin: 24px 0; }
  .client-block .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #86868B; font-weight: 600; margin-bottom: 4px; }
  .client-block .name { font-size: 16px; font-weight: 600; color: #1D1D1F; }
  .client-block .info { font-size: 13px; color: #86868B; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #86868B; font-weight: 600; padding: 10px 12px; border-bottom: 1px solid #E5E5EA; }
  td { padding: 14px 12px; border-bottom: 1px solid #F2F2F7; font-size: 14px; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; tabular-nums: true; }
  .desc-main { font-weight: 600; color: #1D1D1F; }
  .desc-details { color: #86868B; font-size: 12.5px; margin-top: 3px; }
  .totals { margin-top: 18px; margin-left: auto; width: 320px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .totals .row.big { border-top: 2px solid #1D1D1F; margin-top: 8px; padding-top: 14px; font-size: 17px; font-weight: 700; }
  .rib { background: #F5F5F7; border-radius: 14px; padding: 20px; margin: 24px 0; font-size: 13px; line-height: 1.65; color: #1D1D1F; }
  .rib .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #86868B; font-weight: 600; margin-bottom: 8px; }
  .rib .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .rib .row span:first-child { color: #86868B; }
  .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #E5E5EA; font-size: 11.5px; color: #86868B; line-height: 1.6; text-align: center; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <img src="${LOGO_URL}" alt="DELIVERY Digital" />
    <div class="meta">
      <div class="ref">${DL.invoice} ${escapeHtml(invoiceRef)}</div>
      <div>${DL.issuedOn} <strong>${today}</strong></div>
      <div>${DL.dueDate} <strong>${dueDate}</strong></div>
      <div style="margin-top:6px;font-size:11.5px;">${DL.relatedQuote} : <strong>${escapeHtml(quote.ref || '')}</strong></div>
    </div>
  </div>

  <h1>${DL.invoiceTitle}</h1>

  <div class="client-block">
    <div class="label">${DL.to}</div>
    <div class="name">${escapeHtml(quote.client?.name || '')}</div>
    <div class="info">
      ${quote.client?.company ? escapeHtml(quote.client.company) + '<br/>' : ''}
      ${quote.client?.email ? escapeHtml(quote.client.email) : ''}
      ${quote.client?.phone ? ' · ' + escapeHtml(quote.client.phone) : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:70%">${DL.service}</th>
        <th class="num" style="width:30%">${DL.amountHt}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="desc-main">${escapeHtml(acompte.label)}</div>
          <div class="desc-details">${escapeHtml(DL.percentOf(acompte.percent, quote.title, quote.ref))}</div>
        </td>
        <td class="num"><strong>${M(amountHT)}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>${DL.subtotalHt}</span><strong>${M(amountHT)}</strong></div>
    <div class="row"><span>${DL.tax} (${tvaRate} %)</span><span>${M(amountTVA)}</span></div>
    <div class="row big"><span>${DL.netToPay}</span><span>${M(amount)}</span></div>
  </div>

  ${bank.iban ? `
    <div class="rib">
      <div class="label">${DL.bankDetails}</div>
      <div class="row"><span>${DL.beneficiary}</span><span style="font-weight:600;">${escapeHtml(bank.holderName || '')}</span></div>
      ${bank.bankName ? `<div class="row"><span>${DL.bank}</span><span>${escapeHtml(bank.bankName)}</span></div>` : ''}
      <div class="row"><span>IBAN</span><span style="font-family:monospace;font-size:13px;">${escapeHtml(bank.iban)}</span></div>
      ${bank.bic ? `<div class="row"><span>${DL.bicSwift}</span><span style="font-family:monospace;">${escapeHtml(bank.bic)}</span></div>` : ''}
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #E5E5EA;font-size:12px;color:#86868B;">${DL.txRef} : <strong style="color:#1D1D1F;">${escapeHtml(invoiceRef)}</strong></div>
    </div>
  ` : ''}

  <div class="footer">
    ${escapeHtml(ISS.legalName)} · ${escapeHtml(ISS.address)}<br/>
    ${escapeHtml(ISS.legalLine)}<br/>
    ${escapeHtml(ISS.email)}${ISS.phone ? ' · ' + escapeHtml(ISS.phone) : ''} · ${escapeHtml(ISS.website)}
  </div>
</div>
</body>
</html>`;
}

const ACCEPT_LABELS = {
  fr: { accepted: 'Devis accepté', acceptedOn: 'Accepté le', acceptedBy: 'par', rejected: 'Devis refusé', rejectedOn: 'Refusé le', actionTitle: 'Accepter et signer le devis', actionHelp: 'En signant electroniquement, vous validez le devis et autorisez le demarrage du projet selon les termes ci-dessus.', signerName: 'Votre nom complet', signerEmail: 'Votre email', accept: 'Accepter le devis', reject: 'Refuser', rejectReasonPlaceholder: 'Raison (optionnel)', terms: 'J\'accepte les termes du devis et confirme mon engagement.', thanksTitle: 'Merci pour votre confiance.', thanksBody: 'Votre signature a ete enregistree. Notre equipe revient vers vous tres vite pour la suite.', errorMissing: 'Veuillez remplir nom et email.' },
  en: { accepted: 'Quote accepted', acceptedOn: 'Accepted on', acceptedBy: 'by', rejected: 'Quote rejected', rejectedOn: 'Rejected on', actionTitle: 'Accept and sign the quote', actionHelp: 'By signing electronically, you validate this quote and allow us to start the project under the above terms.', signerName: 'Your full name', signerEmail: 'Your email', accept: 'Accept quote', reject: 'Decline', rejectReasonPlaceholder: 'Reason (optional)', terms: 'I accept the terms of this quote and confirm my engagement.', thanksTitle: 'Thank you.', thanksBody: 'Your signature has been recorded. Our team will get back to you shortly.', errorMissing: 'Please fill in name and email.' },
  es: { accepted: 'Presupuesto aceptado', acceptedOn: 'Aceptado el', acceptedBy: 'por', rejected: 'Presupuesto rechazado', rejectedOn: 'Rechazado el', actionTitle: 'Aceptar y firmar el presupuesto', actionHelp: 'Al firmar electronicamente, usted valida este presupuesto y autoriza el inicio del proyecto.', signerName: 'Su nombre completo', signerEmail: 'Su email', accept: 'Aceptar', reject: 'Rechazar', rejectReasonPlaceholder: 'Razon (opcional)', terms: 'Acepto los terminos de este presupuesto.', thanksTitle: 'Gracias.', thanksBody: 'Su firma ha sido registrada.', errorMissing: 'Por favor complete nombre y email.' },
  de: { accepted: 'Angebot angenommen', acceptedOn: 'Angenommen am', acceptedBy: 'von', rejected: 'Angebot abgelehnt', rejectedOn: 'Abgelehnt am', actionTitle: 'Angebot akzeptieren und unterschreiben', actionHelp: 'Mit der elektronischen Unterschrift bestätigen Sie das Angebot.', signerName: 'Ihr vollständiger Name', signerEmail: 'Ihre E-Mail', accept: 'Akzeptieren', reject: 'Ablehnen', rejectReasonPlaceholder: 'Grund (optional)', terms: 'Ich akzeptiere die Bedingungen dieses Angebots.', thanksTitle: 'Vielen Dank.', thanksBody: 'Ihre Unterschrift wurde erfasst.', errorMissing: 'Bitte Name und E-Mail ausfullen.' },
  it: { accepted: 'Preventivo accettato', acceptedOn: 'Accettato il', acceptedBy: 'da', rejected: 'Preventivo rifiutato', rejectedOn: 'Rifiutato il', actionTitle: 'Accettare e firmare il preventivo', actionHelp: 'Firmando elettronicamente accetti i termini.', signerName: 'Nome completo', signerEmail: 'Email', accept: 'Accettare', reject: 'Rifiutare', rejectReasonPlaceholder: 'Motivo (facoltativo)', terms: 'Accetto i termini di questo preventivo.', thanksTitle: 'Grazie.', thanksBody: 'La tua firma e stata registrata.', errorMissing: 'Compilare nome ed email.' },
  pt: { accepted: 'Orçamento aceito', acceptedOn: 'Aceito em', acceptedBy: 'por', rejected: 'Orçamento recusado', rejectedOn: 'Recusado em', actionTitle: 'Aceitar e assinar o orçamento', actionHelp: 'Ao assinar eletronicamente, você valida este orçamento.', signerName: 'Seu nome completo', signerEmail: 'Seu email', accept: 'Aceitar', reject: 'Recusar', rejectReasonPlaceholder: 'Motivo (opcional)', terms: 'Aceito os termos deste orçamento.', thanksTitle: 'Obrigado.', thanksBody: 'Sua assinatura foi registrada.', errorMissing: 'Preencha nome e email.' },
  nl: { accepted: 'Offerte geaccepteerd', acceptedOn: 'Geaccepteerd op', acceptedBy: 'door', rejected: 'Offerte afgewezen', rejectedOn: 'Afgewezen op', actionTitle: 'Offerte accepteren en ondertekenen', actionHelp: 'Door elektronisch te ondertekenen valideert u de offerte en geeft u toestemming om het project te starten.', signerName: 'Uw volledige naam', signerEmail: 'Uw e-mailadres', accept: 'Offerte accepteren', reject: 'Afwijzen', rejectReasonPlaceholder: 'Reden (optioneel)', terms: 'Ik accepteer de voorwaarden van deze offerte.', thanksTitle: 'Dank u wel.', thanksBody: 'Uw handtekening is geregistreerd. Ons team neemt zeer binnenkort contact met u op.', errorMissing: 'Vul naam en e-mailadres in.' },
  sv: { accepted: 'Offert accepterad', acceptedOn: 'Accepterad', acceptedBy: 'av', rejected: 'Offert avvisad', rejectedOn: 'Avvisad', actionTitle: 'Acceptera och signera offerten', actionHelp: 'Genom att signera elektroniskt godkänner du offerten och tillåter projektstart.', signerName: 'Ditt fullständiga namn', signerEmail: 'Din e-post', accept: 'Acceptera offert', reject: 'Avvisa', rejectReasonPlaceholder: 'Anledning (valfritt)', terms: 'Jag accepterar villkoren i denna offert.', thanksTitle: 'Tack.', thanksBody: 'Din signatur har registrerats. Vårt team återkommer snart.', errorMissing: 'Fyll i namn och e-post.' },
  da: { accepted: 'Tilbud accepteret', acceptedOn: 'Accepteret den', acceptedBy: 'af', rejected: 'Tilbud afvist', rejectedOn: 'Afvist den', actionTitle: 'Accepter og underskriv tilbuddet', actionHelp: 'Ved elektronisk underskrift accepterer du tilbuddet og giver tilladelse til projektstart.', signerName: 'Dit fulde navn', signerEmail: 'Din e-mail', accept: 'Acceptér tilbud', reject: 'Afvis', rejectReasonPlaceholder: 'Årsag (valgfri)', terms: 'Jeg accepterer betingelserne i dette tilbud.', thanksTitle: 'Tak.', thanksBody: 'Din underskrift er registreret. Vores team vender snart tilbage.', errorMissing: 'Udfyld navn og e-mail.' },
  no: { accepted: 'Tilbud akseptert', acceptedOn: 'Akseptert', acceptedBy: 'av', rejected: 'Tilbud avvist', rejectedOn: 'Avvist', actionTitle: 'Aksepter og signer tilbudet', actionHelp: 'Ved elektronisk signering aksepterer du tilbudet og gir tillatelse til prosjektstart.', signerName: 'Ditt fulle navn', signerEmail: 'Din e-post', accept: 'Aksepter tilbud', reject: 'Avvis', rejectReasonPlaceholder: 'Årsak (valgfritt)', terms: 'Jeg aksepterer vilkårene i dette tilbudet.', thanksTitle: 'Takk.', thanksBody: 'Signaturen din er registrert. Teamet vårt kommer snart tilbake.', errorMissing: 'Fyll inn navn og e-post.' },
  fi: { accepted: 'Tarjous hyväksytty', acceptedOn: 'Hyväksytty', acceptedBy: 'käyttäjältä', rejected: 'Tarjous hylätty', rejectedOn: 'Hylätty', actionTitle: 'Hyväksy ja allekirjoita tarjous', actionHelp: 'Sähköisellä allekirjoituksella vahvistat tarjouksen ja annat luvan projektin aloittamiseen.', signerName: 'Koko nimesi', signerEmail: 'Sähköpostiosoitteesi', accept: 'Hyväksy tarjous', reject: 'Hylkää', rejectReasonPlaceholder: 'Syy (valinnainen)', terms: 'Hyväksyn tämän tarjouksen ehdot.', thanksTitle: 'Kiitos.', thanksBody: 'Allekirjoituksesi on tallennettu. Tiimimme palaa pian asiaan.', errorMissing: 'Täytä nimi ja sähköpostiosoite.' },
  pl: { accepted: 'Wycena zaakceptowana', acceptedOn: 'Zaakceptowano dnia', acceptedBy: 'przez', rejected: 'Wycena odrzucona', rejectedOn: 'Odrzucono dnia', actionTitle: 'Zaakceptuj i podpisz wycenę', actionHelp: 'Podpisując elektronicznie, akceptujesz wycenę i pozwalasz na rozpoczęcie projektu.', signerName: 'Twoje pełne imię i nazwisko', signerEmail: 'Twój adres e-mail', accept: 'Zaakceptuj wycenę', reject: 'Odrzuć', rejectReasonPlaceholder: 'Powód (opcjonalnie)', terms: 'Akceptuję warunki tej wyceny.', thanksTitle: 'Dziękujemy.', thanksBody: 'Twój podpis został zarejestrowany. Nasz zespół wkrótce się odezwie.', errorMissing: 'Wypełnij imię i e-mail.' },
  cs: { accepted: 'Cenová nabídka přijata', acceptedOn: 'Přijato dne', acceptedBy: 'od', rejected: 'Cenová nabídka odmítnuta', rejectedOn: 'Odmítnuto dne', actionTitle: 'Přijmout a podepsat cenovou nabídku', actionHelp: 'Elektronickým podpisem schvalujete cenovou nabídku a povolujete zahájení projektu.', signerName: 'Vaše celé jméno', signerEmail: 'Váš e-mail', accept: 'Přijmout nabídku', reject: 'Odmítnout', rejectReasonPlaceholder: 'Důvod (volitelně)', terms: 'Souhlasím s podmínkami této cenové nabídky.', thanksTitle: 'Děkujeme.', thanksBody: 'Váš podpis byl zaznamenán. Náš tým se brzy ozve.', errorMissing: 'Vyplňte jméno a e-mail.' },
  hu: { accepted: 'Árajánlat elfogadva', acceptedOn: 'Elfogadva', acceptedBy: 'által', rejected: 'Árajánlat elutasítva', rejectedOn: 'Elutasítva', actionTitle: 'Árajánlat elfogadása és aláírása', actionHelp: 'Az elektronikus aláírással elfogadja az árajánlatot és engedélyezi a projekt indítását.', signerName: 'Teljes neve', signerEmail: 'E-mail címe', accept: 'Árajánlat elfogadása', reject: 'Elutasítás', rejectReasonPlaceholder: 'Indok (opcionális)', terms: 'Elfogadom az árajánlat feltételeit.', thanksTitle: 'Köszönjük.', thanksBody: 'Aláírását rögzítettük. Csapatunk hamarosan jelentkezik.', errorMissing: 'Töltse ki a nevet és az e-mail címet.' },
  el: { accepted: 'Η προσφορά έγινε αποδεκτή', acceptedOn: 'Έγινε αποδεκτή στις', acceptedBy: 'από', rejected: 'Η προσφορά απορρίφθηκε', rejectedOn: 'Απορρίφθηκε στις', actionTitle: 'Αποδοχή και υπογραφή της προσφοράς', actionHelp: 'Με την ηλεκτρονική υπογραφή αποδέχεστε την προσφορά και επιτρέπετε την έναρξη του έργου.', signerName: 'Το πλήρες όνομά σας', signerEmail: 'Η διεύθυνση email σας', accept: 'Αποδοχή προσφοράς', reject: 'Απόρριψη', rejectReasonPlaceholder: 'Λόγος (προαιρετικό)', terms: 'Αποδέχομαι τους όρους αυτής της προσφοράς.', thanksTitle: 'Ευχαριστούμε.', thanksBody: 'Η υπογραφή σας καταχωρήθηκε. Η ομάδα μας θα επικοινωνήσει σύντομα.', errorMissing: 'Συμπληρώστε όνομα και email.' },
  tr: { accepted: 'Teklif kabul edildi', acceptedOn: 'Kabul tarihi', acceptedBy: 'tarafından', rejected: 'Teklif reddedildi', rejectedOn: 'Red tarihi', actionTitle: 'Teklifi kabul et ve imzala', actionHelp: 'Elektronik imza ile teklifi onaylar ve projenin başlamasına izin vermiş olursunuz.', signerName: 'Tam adınız', signerEmail: 'E-posta adresiniz', accept: 'Teklifi kabul et', reject: 'Reddet', rejectReasonPlaceholder: 'Sebep (isteğe bağlı)', terms: 'Bu teklifin şartlarını kabul ediyorum.', thanksTitle: 'Teşekkür ederiz.', thanksBody: 'İmzanız kaydedildi. Ekibimiz kısa süre içinde size geri dönecektir.', errorMissing: 'Ad ve e-postayı doldurun.' },
  ru: { accepted: 'Предложение принято', acceptedOn: 'Принято', acceptedBy: 'кем', rejected: 'Предложение отклонено', rejectedOn: 'Отклонено', actionTitle: 'Принять и подписать предложение', actionHelp: 'Подписывая электронно, вы подтверждаете предложение и разрешаете начало проекта.', signerName: 'Ваше полное имя', signerEmail: 'Ваш email', accept: 'Принять предложение', reject: 'Отклонить', rejectReasonPlaceholder: 'Причина (необязательно)', terms: 'Я принимаю условия этого предложения.', thanksTitle: 'Спасибо.', thanksBody: 'Ваша подпись зарегистрирована. Наша команда скоро свяжется с вами.', errorMissing: 'Заполните имя и email.' },
  ar: { accepted: 'تم قبول عرض السعر', acceptedOn: 'تم القبول في', acceptedBy: 'بواسطة', rejected: 'تم رفض عرض السعر', rejectedOn: 'تم الرفض في', actionTitle: 'قبول عرض السعر والتوقيع', actionHelp: 'بالتوقيع إلكترونياً، فإنك تصادق على عرض السعر وتسمح ببدء المشروع.', signerName: 'اسمك الكامل', signerEmail: 'بريدك الإلكتروني', accept: 'قبول عرض السعر', reject: 'رفض', rejectReasonPlaceholder: 'السبب (اختياري)', terms: 'أوافق على شروط عرض السعر هذا.', thanksTitle: 'شكراً لكم.', thanksBody: 'تم تسجيل توقيعك. سيتواصل معك فريقنا قريباً.', errorMissing: 'يرجى إدخال الاسم والبريد الإلكتروني.' },
  fa: { accepted: 'پیش‌فاکتور پذیرفته شد', acceptedOn: 'پذیرفته شده در', acceptedBy: 'توسط', rejected: 'پیش‌فاکتور رد شد', rejectedOn: 'رد شده در', actionTitle: 'پذیرش و امضای پیش‌فاکتور', actionHelp: 'با امضای الکترونیکی، پیش‌فاکتور را تأیید کرده و اجازه شروع پروژه را می‌دهید.', signerName: 'نام کامل شما', signerEmail: 'ایمیل شما', accept: 'پذیرش پیش‌فاکتور', reject: 'رد', rejectReasonPlaceholder: 'دلیل (اختیاری)', terms: 'شرایط این پیش‌فاکتور را می‌پذیرم.', thanksTitle: 'متشکریم.', thanksBody: 'امضای شما ثبت شد. تیم ما به‌زودی با شما تماس می‌گیرد.', errorMissing: 'لطفاً نام و ایمیل را پر کنید.' },
  hi: { accepted: 'कोटेशन स्वीकृत', acceptedOn: 'स्वीकृत तिथि', acceptedBy: 'द्वारा', rejected: 'कोटेशन अस्वीकृत', rejectedOn: 'अस्वीकृत तिथि', actionTitle: 'कोटेशन स्वीकार करें और हस्ताक्षर करें', actionHelp: 'इलेक्ट्रॉनिक रूप से हस्ताक्षर करके आप कोटेशन की पुष्टि करते हैं और परियोजना शुरू करने की अनुमति देते हैं।', signerName: 'आपका पूरा नाम', signerEmail: 'आपका ईमेल', accept: 'कोटेशन स्वीकार करें', reject: 'अस्वीकार करें', rejectReasonPlaceholder: 'कारण (वैकल्पिक)', terms: 'मैं इस कोटेशन की शर्तों को स्वीकार करता हूं।', thanksTitle: 'धन्यवाद।', thanksBody: 'आपका हस्ताक्षर दर्ज कर लिया गया है। हमारी टीम जल्द ही संपर्क करेगी।', errorMissing: 'कृपया नाम और ईमेल भरें।' },
  zh: { accepted: '报价单已接受', acceptedOn: '接受日期', acceptedBy: '由', rejected: '报价单已拒绝', rejectedOn: '拒绝日期', actionTitle: '接受并签署报价单', actionHelp: '通过电子签名，您确认本报价单并授权项目开始。', signerName: '您的全名', signerEmail: '您的电子邮箱', accept: '接受报价单', reject: '拒绝', rejectReasonPlaceholder: '原因（可选）', terms: '我接受本报价单的条款。', thanksTitle: '谢谢。', thanksBody: '您的签名已记录。我们的团队将很快与您联系。', errorMissing: '请填写姓名和电子邮箱。' },
  ja: { accepted: '見積書承諾済み', acceptedOn: '承諾日', acceptedBy: '承諾者', rejected: '見積書拒否', rejectedOn: '拒否日', actionTitle: '見積書を承諾して署名する', actionHelp: '電子署名により、本見積書を承諾し、プロジェクトの開始を許可します。', signerName: 'お名前（フルネーム）', signerEmail: 'メールアドレス', accept: '見積書を承諾', reject: '拒否', rejectReasonPlaceholder: '理由（任意）', terms: '本見積書の条件に同意します。', thanksTitle: 'ありがとうございます。', thanksBody: 'ご署名を記録しました。担当チームより近日中にご連絡いたします。', errorMissing: '名前とメールアドレスをご入力ください。' },
  ko: { accepted: '견적 수락됨', acceptedOn: '수락일', acceptedBy: '수락자', rejected: '견적 거절됨', rejectedOn: '거절일', actionTitle: '견적 수락 및 서명', actionHelp: '전자 서명을 통해 견적을 승인하고 프로젝트 시작을 허가합니다.', signerName: '성함', signerEmail: '이메일', accept: '견적 수락', reject: '거절', rejectReasonPlaceholder: '사유 (선택)', terms: '이 견적의 조건에 동의합니다.', thanksTitle: '감사합니다.', thanksBody: '서명이 기록되었습니다. 저희 팀이 곧 연락드리겠습니다.', errorMissing: '이름과 이메일을 입력해 주세요.' },
};

// Labels facture d'acompte (PDF + email) en 23 langues.
// @author Rabah Ziane - 2026-05-11
const DEPOSIT_LABELS = {
  fr: { invoice: 'Facture', invoiceTitle: "Facture d'acompte", issuedOn: 'Émise le', dueDate: 'Échéance', relatedQuote: 'Devis associé', to: "À l'attention de", service: 'Prestation', amountHt: 'Montant HT', subtotalHt: 'Sous-total HT', tax: 'TVA', netToPay: 'Net à payer', bankDetails: 'Coordonnées bancaires', beneficiary: 'Bénéficiaire', bank: 'Banque', bicSwift: 'BIC / SWIFT', txRef: 'Référence à indiquer dans le virement', percentOf: (p, title, ref) => `${p} % de ${title || 'Devis'} (réf. ${ref || ''})`, subject: (ref, p, qref) => `Facture d'acompte ${ref} - ${p} % du devis ${qref}`, mailTitle: 'Merci pour votre confiance.', mailBody1: (qref, ref) => `Suite à la signature du devis <strong>${qref}</strong>, veuillez trouver en pièce jointe la facture d'acompte <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Montant à régler : <strong>${amount}</strong> (${p} % du total).`, mailBody3: (due) => `Coordonnées bancaires et référence de virement dans la facture. Échéance : <strong>${due}</strong>.`, mailFooter: 'À réception du paiement, nous démarrons le projet.' },
  en: { invoice: 'Invoice', invoiceTitle: 'Deposit invoice', issuedOn: 'Issued on', dueDate: 'Due date', relatedQuote: 'Related quote', to: 'For', service: 'Service', amountHt: 'Amount (excl. tax)', subtotalHt: 'Subtotal (excl. tax)', tax: 'VAT', netToPay: 'Net to pay', bankDetails: 'Bank details', beneficiary: 'Beneficiary', bank: 'Bank', bicSwift: 'BIC / SWIFT', txRef: 'Reference to indicate in the transfer', percentOf: (p, title, ref) => `${p} % of ${title || 'Quote'} (ref. ${ref || ''})`, subject: (ref, p, qref) => `Deposit invoice ${ref} - ${p} % of quote ${qref}`, mailTitle: 'Thank you for your trust.', mailBody1: (qref, ref) => `Following your signature on quote <strong>${qref}</strong>, please find attached the deposit invoice <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Amount to pay: <strong>${amount}</strong> (${p} % of total).`, mailBody3: (due) => `Bank details and transfer reference are in the invoice. Due date: <strong>${due}</strong>.`, mailFooter: 'Once we receive your payment, we kick off the project.' },
  es: { invoice: 'Factura', invoiceTitle: 'Factura de anticipo', issuedOn: 'Emitida el', dueDate: 'Vencimiento', relatedQuote: 'Presupuesto asociado', to: 'Para', service: 'Servicio', amountHt: 'Importe (sin IVA)', subtotalHt: 'Subtotal (sin IVA)', tax: 'IVA', netToPay: 'Neto a pagar', bankDetails: 'Datos bancarios', beneficiary: 'Beneficiario', bank: 'Banco', bicSwift: 'BIC / SWIFT', txRef: 'Referencia a indicar en la transferencia', percentOf: (p, title, ref) => `${p} % de ${title || 'Presupuesto'} (ref. ${ref || ''})`, subject: (ref, p, qref) => `Factura de anticipo ${ref} - ${p} % del presupuesto ${qref}`, mailTitle: 'Gracias por su confianza.', mailBody1: (qref, ref) => `Tras la firma del presupuesto <strong>${qref}</strong>, adjuntamos la factura de anticipo <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Importe a pagar: <strong>${amount}</strong> (${p} % del total).`, mailBody3: (due) => `Los datos bancarios y la referencia de transferencia están en la factura. Vencimiento: <strong>${due}</strong>.`, mailFooter: 'Al recibir el pago, iniciaremos el proyecto.' },
  de: { invoice: 'Rechnung', invoiceTitle: 'Anzahlungsrechnung', issuedOn: 'Ausgestellt am', dueDate: 'Fällig am', relatedQuote: 'Zugehöriges Angebot', to: 'Zu Händen', service: 'Leistung', amountHt: 'Betrag (netto)', subtotalHt: 'Zwischensumme (netto)', tax: 'MwSt.', netToPay: 'Zu zahlen', bankDetails: 'Bankverbindung', beneficiary: 'Begünstigter', bank: 'Bank', bicSwift: 'BIC / SWIFT', txRef: 'Verwendungszweck der Überweisung', percentOf: (p, title, ref) => `${p} % von ${title || 'Angebot'} (Ref. ${ref || ''})`, subject: (ref, p, qref) => `Anzahlungsrechnung ${ref} - ${p} % des Angebots ${qref}`, mailTitle: 'Vielen Dank für Ihr Vertrauen.', mailBody1: (qref, ref) => `Im Anschluss an die Unterzeichnung des Angebots <strong>${qref}</strong> finden Sie anbei die Anzahlungsrechnung <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Zu zahlender Betrag: <strong>${amount}</strong> (${p} % der Gesamtsumme).`, mailBody3: (due) => `Bankverbindung und Verwendungszweck stehen in der Rechnung. Fälligkeit: <strong>${due}</strong>.`, mailFooter: 'Nach Zahlungseingang starten wir das Projekt.' },
  it: { invoice: 'Fattura', invoiceTitle: 'Fattura di acconto', issuedOn: 'Emessa il', dueDate: 'Scadenza', relatedQuote: 'Preventivo associato', to: 'Per', service: 'Servizio', amountHt: 'Importo (escl. IVA)', subtotalHt: 'Subtotale (escl. IVA)', tax: 'IVA', netToPay: 'Netto da pagare', bankDetails: 'Coordinate bancarie', beneficiary: 'Beneficiario', bank: 'Banca', bicSwift: 'BIC / SWIFT', txRef: 'Riferimento da indicare nel bonifico', percentOf: (p, title, ref) => `${p} % di ${title || 'Preventivo'} (rif. ${ref || ''})`, subject: (ref, p, qref) => `Fattura di acconto ${ref} - ${p} % del preventivo ${qref}`, mailTitle: 'Grazie per la fiducia.', mailBody1: (qref, ref) => `A seguito della firma del preventivo <strong>${qref}</strong>, trova in allegato la fattura di acconto <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Importo da pagare: <strong>${amount}</strong> (${p} % del totale).`, mailBody3: (due) => `Le coordinate bancarie e il riferimento del bonifico sono nella fattura. Scadenza: <strong>${due}</strong>.`, mailFooter: 'Al ricevimento del pagamento, avviamo il progetto.' },
  pt: { invoice: 'Fatura', invoiceTitle: 'Fatura de sinal', issuedOn: 'Emitida em', dueDate: 'Vencimento', relatedQuote: 'Orçamento associado', to: 'Para', service: 'Serviço', amountHt: 'Valor (sem IVA)', subtotalHt: 'Subtotal (sem IVA)', tax: 'IVA', netToPay: 'Líquido a pagar', bankDetails: 'Dados bancários', beneficiary: 'Beneficiário', bank: 'Banco', bicSwift: 'BIC / SWIFT', txRef: 'Referência a indicar na transferência', percentOf: (p, title, ref) => `${p} % de ${title || 'Orçamento'} (ref. ${ref || ''})`, subject: (ref, p, qref) => `Fatura de sinal ${ref} - ${p} % do orçamento ${qref}`, mailTitle: 'Obrigado pela sua confiança.', mailBody1: (qref, ref) => `Após a assinatura do orçamento <strong>${qref}</strong>, segue em anexo a fatura de sinal <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Valor a pagar: <strong>${amount}</strong> (${p} % do total).`, mailBody3: (due) => `Os dados bancários e a referência da transferência estão na fatura. Vencimento: <strong>${due}</strong>.`, mailFooter: 'Ao recebermos o pagamento, iniciamos o projeto.' },
  nl: { invoice: 'Factuur', invoiceTitle: 'Aanbetalingsfactuur', issuedOn: 'Uitgegeven op', dueDate: 'Vervaldatum', relatedQuote: 'Bijbehorende offerte', to: 'T.a.v.', service: 'Dienst', amountHt: 'Bedrag (excl. btw)', subtotalHt: 'Subtotaal (excl. btw)', tax: 'Btw', netToPay: 'Netto te betalen', bankDetails: 'Bankgegevens', beneficiary: 'Begunstigde', bank: 'Bank', bicSwift: 'BIC / SWIFT', txRef: 'Te vermelden referentie bij overschrijving', percentOf: (p, title, ref) => `${p} % van ${title || 'Offerte'} (ref. ${ref || ''})`, subject: (ref, p, qref) => `Aanbetalingsfactuur ${ref} - ${p} % van offerte ${qref}`, mailTitle: 'Bedankt voor uw vertrouwen.', mailBody1: (qref, ref) => `Na ondertekening van offerte <strong>${qref}</strong> vindt u in de bijlage de aanbetalingsfactuur <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Te betalen bedrag: <strong>${amount}</strong> (${p} % van het totaal).`, mailBody3: (due) => `Bankgegevens en overschrijvingsreferentie staan in de factuur. Vervaldatum: <strong>${due}</strong>.`, mailFooter: 'Na ontvangst van betaling starten we het project.' },
  sv: { invoice: 'Faktura', invoiceTitle: 'Handpenningfaktura', issuedOn: 'Utfärdat den', dueDate: 'Förfallodag', relatedQuote: 'Tillhörande offert', to: 'Att.', service: 'Tjänst', amountHt: 'Belopp (exkl. moms)', subtotalHt: 'Delsumma (exkl. moms)', tax: 'Moms', netToPay: 'Netto att betala', bankDetails: 'Bankuppgifter', beneficiary: 'Mottagare', bank: 'Bank', bicSwift: 'BIC / SWIFT', txRef: 'Referens att ange i överföringen', percentOf: (p, title, ref) => `${p} % av ${title || 'Offert'} (ref. ${ref || ''})`, subject: (ref, p, qref) => `Handpenningfaktura ${ref} - ${p} % av offerten ${qref}`, mailTitle: 'Tack för ditt förtroende.', mailBody1: (qref, ref) => `Efter signering av offert <strong>${qref}</strong> bifogas handpenningfakturan <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Belopp att betala: <strong>${amount}</strong> (${p} % av totalt).`, mailBody3: (due) => `Bankuppgifter och referens finns i fakturan. Förfallodag: <strong>${due}</strong>.`, mailFooter: 'När vi mottar betalningen startar vi projektet.' },
  da: { invoice: 'Faktura', invoiceTitle: 'Depositumfaktura', issuedOn: 'Udstedt den', dueDate: 'Forfaldsdato', relatedQuote: 'Tilhørende tilbud', to: 'Att.', service: 'Ydelse', amountHt: 'Beløb (ekskl. moms)', subtotalHt: 'Subtotal (ekskl. moms)', tax: 'Moms', netToPay: 'Netto til betaling', bankDetails: 'Bankoplysninger', beneficiary: 'Modtager', bank: 'Bank', bicSwift: 'BIC / SWIFT', txRef: 'Reference at angive ved overførsel', percentOf: (p, title, ref) => `${p} % af ${title || 'Tilbud'} (ref. ${ref || ''})`, subject: (ref, p, qref) => `Depositumfaktura ${ref} - ${p} % af tilbuddet ${qref}`, mailTitle: 'Tak for din tillid.', mailBody1: (qref, ref) => `Efter underskriften af tilbuddet <strong>${qref}</strong>, finder du vedhæftet depositumfakturaen <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Beløb til betaling: <strong>${amount}</strong> (${p} % af totalen).`, mailBody3: (due) => `Bankoplysninger og overførselsreference findes i fakturaen. Forfaldsdato: <strong>${due}</strong>.`, mailFooter: 'Ved modtagelse af betaling påbegynder vi projektet.' },
  no: { invoice: 'Faktura', invoiceTitle: 'Depositumfaktura', issuedOn: 'Utstedt', dueDate: 'Forfallsdato', relatedQuote: 'Tilhørende tilbud', to: 'Att.', service: 'Tjeneste', amountHt: 'Beløp (eks. mva)', subtotalHt: 'Subtotal (eks. mva)', tax: 'Mva', netToPay: 'Netto å betale', bankDetails: 'Bankopplysninger', beneficiary: 'Mottaker', bank: 'Bank', bicSwift: 'BIC / SWIFT', txRef: 'Referanse å oppgi ved overføring', percentOf: (p, title, ref) => `${p} % av ${title || 'Tilbud'} (ref. ${ref || ''})`, subject: (ref, p, qref) => `Depositumfaktura ${ref} - ${p} % av tilbudet ${qref}`, mailTitle: 'Takk for tilliten.', mailBody1: (qref, ref) => `Etter signering av tilbudet <strong>${qref}</strong> finner du depositumfakturaen <strong>${ref}</strong> vedlagt.`, mailBody2: (amount, p) => `Beløp å betale: <strong>${amount}</strong> (${p} % av totalen).`, mailBody3: (due) => `Bankopplysninger og overføringsreferanse finnes i fakturaen. Forfallsdato: <strong>${due}</strong>.`, mailFooter: 'Når vi mottar betalingen, starter vi prosjektet.' },
  fi: { invoice: 'Lasku', invoiceTitle: 'Ennakkomaksulasku', issuedOn: 'Päivätty', dueDate: 'Eräpäivä', relatedQuote: 'Liittyvä tarjous', to: 'Vastaanottaja', service: 'Palvelu', amountHt: 'Määrä (alv 0%)', subtotalHt: 'Välisumma (alv 0%)', tax: 'ALV', netToPay: 'Maksettava netto', bankDetails: 'Pankkitiedot', beneficiary: 'Maksunsaaja', bank: 'Pankki', bicSwift: 'BIC / SWIFT', txRef: 'Tilisiirtoon merkittävä viite', percentOf: (p, title, ref) => `${p} % kohteesta ${title || 'Tarjous'} (viite ${ref || ''})`, subject: (ref, p, qref) => `Ennakkomaksulasku ${ref} - ${p} % tarjouksesta ${qref}`, mailTitle: 'Kiitos luottamuksesta.', mailBody1: (qref, ref) => `Tarjouksen <strong>${qref}</strong> allekirjoituksen jälkeen löydät liitteenä ennakkomaksulaskun <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Maksettava summa: <strong>${amount}</strong> (${p} % kokonaissummasta).`, mailBody3: (due) => `Pankkitiedot ja viite ovat laskussa. Eräpäivä: <strong>${due}</strong>.`, mailFooter: 'Maksun saavuttua aloitamme projektin.' },
  pl: { invoice: 'Faktura', invoiceTitle: 'Faktura zaliczkowa', issuedOn: 'Wystawiono dnia', dueDate: 'Termin płatności', relatedQuote: 'Powiązana wycena', to: 'Do rąk', service: 'Usługa', amountHt: 'Kwota (netto)', subtotalHt: 'Suma częściowa (netto)', tax: 'VAT', netToPay: 'Do zapłaty netto', bankDetails: 'Dane bankowe', beneficiary: 'Beneficjent', bank: 'Bank', bicSwift: 'BIC / SWIFT', txRef: 'Tytuł przelewu', percentOf: (p, title, ref) => `${p} % z ${title || 'Wycena'} (nr ${ref || ''})`, subject: (ref, p, qref) => `Faktura zaliczkowa ${ref} - ${p} % wyceny ${qref}`, mailTitle: 'Dziękujemy za zaufanie.', mailBody1: (qref, ref) => `Po podpisaniu wyceny <strong>${qref}</strong> w załączeniu przesyłamy fakturę zaliczkową <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Kwota do zapłaty: <strong>${amount}</strong> (${p} % całości).`, mailBody3: (due) => `Dane bankowe i tytuł przelewu znajdują się na fakturze. Termin: <strong>${due}</strong>.`, mailFooter: 'Po otrzymaniu płatności rozpoczynamy projekt.' },
  cs: { invoice: 'Faktura', invoiceTitle: 'Zálohová faktura', issuedOn: 'Vystaveno dne', dueDate: 'Datum splatnosti', relatedQuote: 'Související nabídka', to: 'K rukám', service: 'Služba', amountHt: 'Částka (bez DPH)', subtotalHt: 'Mezisoučet (bez DPH)', tax: 'DPH', netToPay: 'Netto k úhradě', bankDetails: 'Bankovní spojení', beneficiary: 'Příjemce', bank: 'Banka', bicSwift: 'BIC / SWIFT', txRef: 'Variabilní symbol platby', percentOf: (p, title, ref) => `${p} % z ${title || 'Nabídka'} (ref. ${ref || ''})`, subject: (ref, p, qref) => `Zálohová faktura ${ref} - ${p} % nabídky ${qref}`, mailTitle: 'Děkujeme za důvěru.', mailBody1: (qref, ref) => `Po podpisu nabídky <strong>${qref}</strong> v příloze posíláme zálohovou fakturu <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Částka k úhradě: <strong>${amount}</strong> (${p} % z celku).`, mailBody3: (due) => `Bankovní spojení a variabilní symbol jsou na faktuře. Splatnost: <strong>${due}</strong>.`, mailFooter: 'Po obdržení platby zahájíme projekt.' },
  hu: { invoice: 'Számla', invoiceTitle: 'Előlegszámla', issuedOn: 'Kiállítva', dueDate: 'Esedékesség', relatedQuote: 'Kapcsolódó árajánlat', to: 'Címzett', service: 'Szolgáltatás', amountHt: 'Összeg (nettó)', subtotalHt: 'Részösszeg (nettó)', tax: 'ÁFA', netToPay: 'Fizetendő nettó', bankDetails: 'Bankszámla adatok', beneficiary: 'Kedvezményezett', bank: 'Bank', bicSwift: 'BIC / SWIFT', txRef: 'Közlemény az utaláshoz', percentOf: (p, title, ref) => `${p} % a következőből: ${title || 'Árajánlat'} (hiv. ${ref || ''})`, subject: (ref, p, qref) => `Előlegszámla ${ref} - az ${qref} árajánlat ${p} %-a`, mailTitle: 'Köszönjük a bizalmát.', mailBody1: (qref, ref) => `Az árajánlat <strong>${qref}</strong> aláírását követően mellékelten küldjük az előlegszámlát <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Fizetendő összeg: <strong>${amount}</strong> (a teljes összeg ${p} %-a).`, mailBody3: (due) => `A bankszámla adatok és a közlemény a számlán találhatók. Esedékesség: <strong>${due}</strong>.`, mailFooter: 'A fizetés beérkezésével elindítjuk a projektet.' },
  el: { invoice: 'Τιμολόγιο', invoiceTitle: 'Τιμολόγιο προκαταβολής', issuedOn: 'Εκδόθηκε στις', dueDate: 'Ημερομηνία λήξης', relatedQuote: 'Σχετική προσφορά', to: 'Προς', service: 'Υπηρεσία', amountHt: 'Ποσό (χωρίς ΦΠΑ)', subtotalHt: 'Μερικό σύνολο (χωρίς ΦΠΑ)', tax: 'ΦΠΑ', netToPay: 'Καθαρό προς πληρωμή', bankDetails: 'Τραπεζικά στοιχεία', beneficiary: 'Δικαιούχος', bank: 'Τράπεζα', bicSwift: 'BIC / SWIFT', txRef: 'Αιτιολογία εμβάσματος', percentOf: (p, title, ref) => `${p} % του ${title || 'Προσφορά'} (αναφ. ${ref || ''})`, subject: (ref, p, qref) => `Τιμολόγιο προκαταβολής ${ref} - ${p} % της προσφοράς ${qref}`, mailTitle: 'Σας ευχαριστούμε για την εμπιστοσύνη.', mailBody1: (qref, ref) => `Μετά την υπογραφή της προσφοράς <strong>${qref}</strong>, επισυνάπτεται το τιμολόγιο προκαταβολής <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Ποσό προς πληρωμή: <strong>${amount}</strong> (${p} % του συνόλου).`, mailBody3: (due) => `Τα τραπεζικά στοιχεία και η αιτιολογία εμβάσματος αναγράφονται στο τιμολόγιο. Λήξη: <strong>${due}</strong>.`, mailFooter: 'Με τη λήψη της πληρωμής, ξεκινάμε το έργο.' },
  tr: { invoice: 'Fatura', invoiceTitle: 'Ön ödeme faturası', issuedOn: 'Düzenleme tarihi', dueDate: 'Son ödeme tarihi', relatedQuote: 'İlgili teklif', to: 'Sayın', service: 'Hizmet', amountHt: 'Tutar (KDV hariç)', subtotalHt: 'Ara toplam (KDV hariç)', tax: 'KDV', netToPay: 'Net ödenecek', bankDetails: 'Banka bilgileri', beneficiary: 'Lehdar', bank: 'Banka', bicSwift: 'BIC / SWIFT', txRef: 'Havalede belirtilecek referans', percentOf: (p, title, ref) => `${title || 'Teklif'} (ref. ${ref || ''}) için %${p}`, subject: (ref, p, qref) => `Ön ödeme faturası ${ref} - ${qref} teklifinin %${p}'i`, mailTitle: 'Güveniniz için teşekkür ederiz.', mailBody1: (qref, ref) => `<strong>${qref}</strong> teklifinin imzalanmasının ardından ek olarak ön ödeme faturasını <strong>${ref}</strong> bulabilirsiniz.`, mailBody2: (amount, p) => `Ödenecek tutar: <strong>${amount}</strong> (toplamın %${p}'i).`, mailBody3: (due) => `Banka bilgileri ve havale referansı fatura üzerindedir. Son ödeme: <strong>${due}</strong>.`, mailFooter: 'Ödeme alındığında projeyi başlatırız.' },
  ru: { invoice: 'Счёт', invoiceTitle: 'Счёт на предоплату', issuedOn: 'Выдан', dueDate: 'Срок оплаты', relatedQuote: 'Связанное предложение', to: 'Кому', service: 'Услуга', amountHt: 'Сумма (без НДС)', subtotalHt: 'Промежуточный итог (без НДС)', tax: 'НДС', netToPay: 'К оплате', bankDetails: 'Банковские реквизиты', beneficiary: 'Получатель', bank: 'Банк', bicSwift: 'BIC / SWIFT', txRef: 'Назначение платежа', percentOf: (p, title, ref) => `${p} % от ${title || 'Предложение'} (реф. ${ref || ''})`, subject: (ref, p, qref) => `Счёт на предоплату ${ref} - ${p} % предложения ${qref}`, mailTitle: 'Спасибо за доверие.', mailBody1: (qref, ref) => `После подписания предложения <strong>${qref}</strong> во вложении счёт на предоплату <strong>${ref}</strong>.`, mailBody2: (amount, p) => `Сумма к оплате: <strong>${amount}</strong> (${p} % от общей суммы).`, mailBody3: (due) => `Банковские реквизиты и назначение платежа указаны в счёте. Срок: <strong>${due}</strong>.`, mailFooter: 'После получения оплаты мы запускаем проект.' },
  ar: { invoice: 'فاتورة', invoiceTitle: 'فاتورة دفعة مقدمة', issuedOn: 'تاريخ الإصدار', dueDate: 'تاريخ الاستحقاق', relatedQuote: 'عرض السعر المرتبط', to: 'إلى', service: 'الخدمة', amountHt: 'المبلغ (بدون ضريبة)', subtotalHt: 'الإجمالي الفرعي (بدون ضريبة)', tax: 'ضريبة القيمة المضافة', netToPay: 'صافي المستحق', bankDetails: 'المعلومات البنكية', beneficiary: 'المستفيد', bank: 'البنك', bicSwift: 'BIC / SWIFT', txRef: 'المرجع المطلوب ذكره في التحويل', percentOf: (p, title, ref) => `${p} % من ${title || 'عرض السعر'} (مرجع ${ref || ''})`, subject: (ref, p, qref) => `فاتورة دفعة مقدمة ${ref} - ${p} % من عرض السعر ${qref}`, mailTitle: 'شكراً لثقتكم.', mailBody1: (qref, ref) => `بعد توقيع عرض السعر <strong>${qref}</strong>، نرفق لكم فاتورة الدفعة المقدمة <strong>${ref}</strong>.`, mailBody2: (amount, p) => `المبلغ المستحق: <strong>${amount}</strong> (${p} % من الإجمالي).`, mailBody3: (due) => `المعلومات البنكية والمرجع موجودة في الفاتورة. الاستحقاق: <strong>${due}</strong>.`, mailFooter: 'عند استلام الدفعة، نبدأ المشروع.' },
  fa: { invoice: 'فاکتور', invoiceTitle: 'فاکتور پیش‌پرداخت', issuedOn: 'تاریخ صدور', dueDate: 'تاریخ سررسید', relatedQuote: 'پیش‌فاکتور مرتبط', to: 'به', service: 'خدمت', amountHt: 'مبلغ (بدون مالیات)', subtotalHt: 'جمع جزئی (بدون مالیات)', tax: 'مالیات بر ارزش افزوده', netToPay: 'مبلغ خالص قابل پرداخت', bankDetails: 'اطلاعات بانکی', beneficiary: 'ذی‌نفع', bank: 'بانک', bicSwift: 'BIC / SWIFT', txRef: 'مرجع برای درج در انتقال', percentOf: (p, title, ref) => `${p} % از ${title || 'پیش‌فاکتور'} (مرجع ${ref || ''})`, subject: (ref, p, qref) => `فاکتور پیش‌پرداخت ${ref} - ${p} % از پیش‌فاکتور ${qref}`, mailTitle: 'از اعتماد شما متشکریم.', mailBody1: (qref, ref) => `پس از امضای پیش‌فاکتور <strong>${qref}</strong>، فاکتور پیش‌پرداخت <strong>${ref}</strong> پیوست شده است.`, mailBody2: (amount, p) => `مبلغ قابل پرداخت: <strong>${amount}</strong> (${p} % از کل).`, mailBody3: (due) => `اطلاعات بانکی و مرجع انتقال در فاکتور درج شده است. سررسید: <strong>${due}</strong>.`, mailFooter: 'با دریافت پرداخت، پروژه را آغاز می‌کنیم.' },
  hi: { invoice: 'चालान', invoiceTitle: 'अग्रिम चालान', issuedOn: 'जारी तिथि', dueDate: 'देय तिथि', relatedQuote: 'संबंधित कोटेशन', to: 'प्रति', service: 'सेवा', amountHt: 'राशि (कर रहित)', subtotalHt: 'उप-योग (कर रहित)', tax: 'वैट', netToPay: 'देय शुद्ध राशि', bankDetails: 'बैंक विवरण', beneficiary: 'लाभार्थी', bank: 'बैंक', bicSwift: 'BIC / SWIFT', txRef: 'स्थानांतरण में दिया जाने वाला संदर्भ', percentOf: (p, title, ref) => `${title || 'कोटेशन'} (संदर्भ ${ref || ''}) का ${p} %`, subject: (ref, p, qref) => `अग्रिम चालान ${ref} - कोटेशन ${qref} का ${p} %`, mailTitle: 'आपके विश्वास के लिए धन्यवाद।', mailBody1: (qref, ref) => `कोटेशन <strong>${qref}</strong> पर हस्ताक्षर के बाद, संलग्न अग्रिम चालान <strong>${ref}</strong> देखें।`, mailBody2: (amount, p) => `देय राशि: <strong>${amount}</strong> (कुल का ${p} %)।`, mailBody3: (due) => `बैंक विवरण और स्थानांतरण संदर्भ चालान में हैं। देय तिथि: <strong>${due}</strong>।`, mailFooter: 'भुगतान प्राप्त होने पर, हम परियोजना शुरू करते हैं।' },
  zh: { invoice: '发票', invoiceTitle: '预付款发票', issuedOn: '开具日期', dueDate: '到期日', relatedQuote: '关联报价单', to: '收件人', service: '服务项目', amountHt: '金额（不含税）', subtotalHt: '小计（不含税）', tax: '增值税', netToPay: '应付净额', bankDetails: '银行信息', beneficiary: '收款人', bank: '银行', bicSwift: 'BIC / SWIFT', txRef: '汇款时请注明的备注', percentOf: (p, title, ref) => `${title || '报价单'}（编号 ${ref || ''}）的 ${p} %`, subject: (ref, p, qref) => `预付款发票 ${ref} - 报价单 ${qref} 的 ${p} %`, mailTitle: '感谢您的信任。', mailBody1: (qref, ref) => `在签署报价单 <strong>${qref}</strong> 之后，附件为预付款发票 <strong>${ref}</strong>。`, mailBody2: (amount, p) => `应付金额：<strong>${amount}</strong>（总额的 ${p} %）。`, mailBody3: (due) => `银行信息和汇款备注请见发票。到期日：<strong>${due}</strong>。`, mailFooter: '收到付款后，我们将启动项目。' },
  ja: { invoice: '請求書', invoiceTitle: '前受金請求書', issuedOn: '発行日', dueDate: '支払期日', relatedQuote: '関連見積書', to: '宛先', service: 'サービス', amountHt: '金額（税抜）', subtotalHt: '小計（税抜）', tax: '消費税', netToPay: 'お支払い金額', bankDetails: '振込先', beneficiary: '受取人', bank: '銀行', bicSwift: 'BIC / SWIFT', txRef: 'お振込み時の参照番号', percentOf: (p, title, ref) => `${title || '見積書'}（参照 ${ref || ''}）の ${p} %`, subject: (ref, p, qref) => `前受金請求書 ${ref} - 見積書 ${qref} の ${p} %`, mailTitle: 'ご信頼ありがとうございます。', mailBody1: (qref, ref) => `見積書 <strong>${qref}</strong> へのご署名を受け、前受金請求書 <strong>${ref}</strong> を添付いたします。`, mailBody2: (amount, p) => `お支払い金額：<strong>${amount}</strong>（合計の ${p} %）。`, mailBody3: (due) => `振込先と参照番号は請求書内に記載しております。支払期日：<strong>${due}</strong>。`, mailFooter: 'ご入金確認後、プロジェクトを開始いたします。' },
  ko: { invoice: '청구서', invoiceTitle: '선급금 청구서', issuedOn: '발행일', dueDate: '결제 기한', relatedQuote: '관련 견적서', to: '받는 분', service: '서비스', amountHt: '금액 (부가세 별도)', subtotalHt: '소계 (부가세 별도)', tax: '부가세', netToPay: '실 결제 금액', bankDetails: '은행 정보', beneficiary: '수령인', bank: '은행', bicSwift: 'BIC / SWIFT', txRef: '송금 시 기재할 참조 번호', percentOf: (p, title, ref) => `${title || '견적서'} (참조 ${ref || ''})의 ${p} %`, subject: (ref, p, qref) => `선급금 청구서 ${ref} - 견적서 ${qref}의 ${p} %`, mailTitle: '신뢰해 주셔서 감사합니다.', mailBody1: (qref, ref) => `견적서 <strong>${qref}</strong> 서명 후, 첨부된 선급금 청구서 <strong>${ref}</strong>를 확인해 주세요.`, mailBody2: (amount, p) => `결제 금액: <strong>${amount}</strong> (총 금액의 ${p} %).`, mailBody3: (due) => `은행 정보와 송금 참조 번호는 청구서에 있습니다. 결제 기한: <strong>${due}</strong>.`, mailFooter: '결제 확인 후 프로젝트를 시작합니다.' },
};
function getDepositLabels(lang) {
  return DEPOSIT_LABELS[(lang || 'fr').toLowerCase()] || DEPOSIT_LABELS.fr;
}

function renderAcceptanceBlock(quote, L, lang) {
  const A = ACCEPT_LABELS[lang] || ACCEPT_LABELS.fr;
  const dateLocale = getDateLocale(lang);

  if (quote.status === 'accepted' && quote.acceptance?.signedAt) {
    const dt = new Date(quote.acceptance.signedAt).toLocaleString(dateLocale);
    return `
      <div style="margin:30px 0;padding:24px;background:#34C759;background:linear-gradient(135deg,#34C759,#28A745);border-radius:18px;text-align:center;color:#fff;">
        <div style="font-size:18px;font-weight:700;margin-bottom:6px;">✓ ${A.accepted}</div>
        <div style="font-size:13.5px;opacity:0.9;">${A.acceptedOn} <strong>${dt}</strong> ${A.acceptedBy} <strong>${escapeHtml(quote.acceptance.signerName || '')}</strong></div>
      </div>
    `;
  }

  if (quote.status === 'rejected' && quote.rejection?.rejectedAt) {
    const dt = new Date(quote.rejection.rejectedAt).toLocaleString(dateLocale);
    return `
      <div style="margin:30px 0;padding:20px;background:#FFE5E5;border-radius:18px;text-align:center;color:#FF3B30;">
        <div style="font-size:16px;font-weight:700;">${A.rejected}</div>
        <div style="font-size:13px;opacity:0.85;margin-top:4px;">${A.rejectedOn} ${dt}</div>
      </div>
    `;
  }

  if (quote.status === 'expired') {
    return `<div style="margin:30px 0;padding:18px;background:#F5F5F7;border-radius:14px;text-align:center;color:#86868B;font-size:13.5px;">⌛ ${L.validUntil} ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString(dateLocale) : ''}</div>`;
  }

  // Not yet accepted - show form
  return `
    <div id="accept" style="margin:36px 0 0;padding:28px;background:#F2EFE9;border-radius:18px;background-image:radial-gradient(circle at 1px 1px, rgba(29,29,31,0.08) 1px, transparent 0);background-size:14px 14px;">
      <h3 style="margin:0 0 6px;font-family:'Charter','Iowan Old Style',Georgia,serif;font-weight:700;font-size:22px;color:#1D1D1F;">${A.actionTitle}</h3>
      <p style="margin:0 0 18px;font-size:13.5px;color:#86868B;line-height:1.55;">${A.actionHelp}</p>

      <form id="accept-form" method="POST" action="/devis/${quote.publicToken}/accept" style="display:grid;gap:10px;max-width:480px;">
        <input type="text" name="signerName" required placeholder="${A.signerName}" style="padding:11px 14px;border-radius:10px;border:1px solid #E5E5EA;font-size:14px;outline:none;background:#fff;" />
        <input type="email" name="signerEmail" required placeholder="${A.signerEmail}" value="${escapeHtml(quote.client?.email || '')}" style="padding:11px 14px;border-radius:10px;border:1px solid #E5E5EA;font-size:14px;outline:none;background:#fff;" />
        <label style="display:flex;align-items:flex-start;gap:8px;font-size:12.5px;color:#1D1D1F;line-height:1.45;cursor:pointer;">
          <input type="checkbox" required style="margin-top:3px;flex-shrink:0;" />
          <span>${A.terms}</span>
        </label>
        <button type="submit" style="margin-top:8px;padding:13px 24px;background:#1D1D1F;color:#fff;border:0;border-radius:999px;font-size:15px;font-weight:600;cursor:pointer;">${A.accept}</button>
      </form>

      <details style="margin-top:18px;font-size:12.5px;color:#86868B;">
        <summary style="cursor:pointer;">${A.reject}</summary>
        <form method="POST" action="/devis/${quote.publicToken}/reject" style="margin-top:10px;display:grid;gap:8px;max-width:480px;">
          <textarea name="reason" rows="2" placeholder="${A.rejectReasonPlaceholder}" style="padding:8px 12px;border-radius:8px;border:1px solid #E5E5EA;font-size:13px;outline:none;background:#fff;resize:vertical;"></textarea>
          <button type="submit" style="padding:8px 16px;background:#fff;color:#FF3B30;border:1px solid #FF3B30;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;align-self:start;">${A.reject}</button>
        </form>
      </details>
    </div>
  `;
}

router.get('/:id/preview.html', requireAdmin, async (req, res) => {
  try {
    const item = await QuickQuote.findById(req.params.id).lean();
    if (!item) return res.status(404).send('not found');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderHtml(item, { publicView: false }));
  } catch (e) {
    res.status(500).send(e.message);
  }
});

/* ===========================================================
   Send by email
   =========================================================== */
function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'ssl0.ovh.net',
    port,
    secure: port === 465, // SSL implicite sur 465, STARTTLS sur 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

router.post('/:id/send', requireAdmin, async (req, res) => {
  try {
    const quote = await QuickQuote.findById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'not found' });
    if (!quote.client?.email) return res.status(400).json({ error: 'client email required' });

    const transporter = getTransporter();
    const html = renderHtml(quote, { publicView: false });
    const publicLink = `${PUBLIC_BASE}/devis/${quote.publicToken}`;

    const L = getLabels(quote.language || 'fr');
    const A = ACCEPT_LABELS[(quote.language || 'fr').toLowerCase()] || ACCEPT_LABELS.fr;
    // Bouton CTA "Accepter le devis" visible direct dans l'email (au lieu d'un petit lien).
    // Les forms HTML ne marchent pas dans la plupart des clients mail, donc on envoie le client
    // sur la page publique #accept ou la signature est inline.
    // @author Rabah Ziane - 2026-05-11
    const ctaBlock = `
      <div style="text-align:center;margin:24px 0 8px;padding:0 20px;">
        <a href="${publicLink}#accept" style="display:inline-block;padding:16px 36px;background:#1D1D1F;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:16px;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif;">${A.accept}</a>
      </div>
      <p style="text-align:center;font-size:12px;color:#86868B;padding:0 20px 24px;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif;">
        ${A.actionHelp}<br/>
        <a href="${publicLink}" style="color:#86868B;text-decoration:underline;">${publicLink}</a>
      </p>`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'contact@deliverydigital.fr',
      to: quote.client.email,
      bcc: 'contact@deliverydigital.fr',
      subject: L.subject(quote.ref),
      html: html + ctaBlock,
    });

    quote.status = 'sent';
    quote.sentAt = new Date();
    await quote.save();

    res.json({ item: quote, publicLink });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================================================
   Public view (par token, sans auth) - utilisable par le client
   =========================================================== */
publicRouter.use(express.urlencoded({ extended: true })); // pour parser les form POST
publicRouter.use(express.json());

publicRouter.get('/:token', async (req, res) => {
  try {
    const quote = await QuickQuote.findOne({ publicToken: req.params.token });
    if (!quote) return res.status(404).send('Devis introuvable');
    if (quote.status === 'sent' && !quote.viewedAt) {
      quote.status = 'viewed';
      quote.viewedAt = new Date();
      await quote.save();
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderHtml(quote.toObject(), { publicView: true }));
  } catch (e) {
    res.status(500).send(e.message);
  }
});

/* Accept (signer le devis) */
publicRouter.post('/:token/accept', async (req, res) => {
  try {
    const quote = await QuickQuote.findOne({ publicToken: req.params.token });
    if (!quote) return res.status(404).send('Devis introuvable');
    if (quote.status === 'accepted') {
      return res.redirect(`/devis/${req.params.token}#accept`);
    }
    const { signerName, signerEmail } = req.body;
    const lang = (quote.language || 'fr').toLowerCase();
    const A = ACCEPT_LABELS[lang] || ACCEPT_LABELS.fr;
    if (!signerName || !signerEmail) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(`<p style="font-family:Arial;padding:30px;color:#FF3B30">${A.errorMissing} <a href="/devis/${req.params.token}#accept">Retour</a></p>`);
    }

    quote.status = 'accepted';
    quote.acceptedAt = new Date();
    quote.acceptance = {
      signerName: String(signerName).trim().slice(0, 200),
      signerEmail: String(signerEmail).trim().toLowerCase().slice(0, 200),
      ip: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      userAgent: (req.headers['user-agent'] || '').slice(0, 400),
      signedAt: new Date(),
    };
    await quote.save();

    // Email de confirmation a l'admin + au client
    try {
      const transporter = getTransporter();
      const mailHtml = renderHtml(quote.toObject(), { publicView: true });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'contact@deliverydigital.fr',
        to: 'contact@deliverydigital.fr',
        cc: quote.acceptance.signerEmail,
        subject: `[ACCEPTÉ] ${A.acceptedOn} ${quote.ref} - ${quote.acceptance.signerName}`,
        html: `<p>Le devis <strong>${quote.ref}</strong> vient d'etre accepte par <strong>${quote.acceptance.signerName}</strong> (${quote.acceptance.signerEmail}).</p><p>IP : ${quote.acceptance.ip} - User Agent : ${quote.acceptance.userAgent}</p>${mailHtml}`,
      });
    } catch (e) { console.error('mail confirm err:', e.message); }

    // Facture d'acompte auto envoyee au client juste apres la signature.
    // PDF natif (pdfkit) en piece jointe + corps mail court. Statut sauvegarde en DB
    // pour affichage admin (quote.invoice.*).
    // @author Rabah Ziane - 2026-05-11
    try {
      const transporter = getTransporter();
      const quoteObj = quote.toObject();
      const D = buildDepositInvoiceData(quoteObj);
      const DL = getDepositLabels(D.lang);
      const intlLocale = getDateLocale(D.lang);
      const dir = (['ar','fa'].includes(D.lang)) ? 'rtl' : 'ltr';
      const pdfBuffer = await renderDepositInvoicePdf(quoteObj);
      const filename = `${D.invoiceRef}.pdf`;
      const amountFormatted = (() => {
        try { return new Intl.NumberFormat(intlLocale, { style: 'currency', currency: D.currency }).format(D.amount); }
        catch { return `${D.amount.toFixed(2)} ${D.currency}`; }
      })();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'contact@deliverydigital.fr',
        to: quote.acceptance.signerEmail,
        bcc: 'contact@deliverydigital.fr',
        subject: DL.subject(D.invoiceRef, D.acompte.percent, quote.ref),
        html: `
          <div dir="${dir}" style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1D1D1F;">
            <h2 style="margin:0 0 12px;font-family:'Charter','Iowan Old Style',Georgia,serif;font-size:22px;">${DL.mailTitle}</h2>
            <p style="margin:0 0 14px;font-size:14.5px;line-height:1.55;">${DL.mailBody1(quote.ref, D.invoiceRef)}</p>
            <p style="margin:0 0 14px;font-size:14.5px;line-height:1.55;">${DL.mailBody2(amountFormatted, D.acompte.percent)}</p>
            <p style="margin:0 0 14px;font-size:14.5px;line-height:1.55;">${DL.mailBody3(D.dueDate)}</p>
            <p style="margin:24px 0 0;font-size:13px;color:#86868B;">${DL.mailFooter}</p>
          </div>
        `,
        attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
      });

      // Trace en DB pour affichage admin (badge "Facture envoyee").
      quote.invoice = {
        ref: D.invoiceRef,
        amount: D.amount,
        currency: D.currency,
        sentAt: new Date(),
        sentTo: quote.acceptance.signerEmail,
      };
      await quote.save();
    } catch (e) { console.error('deposit invoice err:', e.message); }

    // Si lie a un prospect, mettre a jour son statut
    try {
      if (quote.prospectId) {
        const Prospect = (await import('../models/Prospect.js')).default;
        await Prospect.findByIdAndUpdate(quote.prospectId, {
          status: 'won',
          $push: { timeline: { kind: 'note', body: `Devis ${quote.ref} accepte par ${quote.acceptance.signerName}`, by: 'system', at: new Date() } },
          lastContactAt: new Date(),
        });
      }
    } catch {}

    res.redirect(`/devis/${req.params.token}#accept`);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

/* Reject */
publicRouter.post('/:token/reject', async (req, res) => {
  try {
    const quote = await QuickQuote.findOne({ publicToken: req.params.token });
    if (!quote) return res.status(404).send('Devis introuvable');
    quote.status = 'rejected';
    quote.rejection = {
      reason: String(req.body?.reason || '').slice(0, 600),
      rejectedAt: new Date(),
      ip: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
    };
    await quote.save();

    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'contact@deliverydigital.fr',
        to: 'contact@deliverydigital.fr',
        subject: `[REFUSÉ] Devis ${quote.ref}`,
        html: `<p>Le devis <strong>${quote.ref}</strong> a ete refuse.</p><p><strong>Raison :</strong> ${escapeHtml(quote.rejection.reason || '(non precisee)')}</p>`,
      });
    } catch {}

    res.redirect(`/devis/${req.params.token}#accept`);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

export default router;
export { publicRouter as publicQuotesRouter };
