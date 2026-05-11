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
  de: { quote: 'Angebot', emittedOn: 'Ausgestellt am', validUntil: 'Gültig bis', to: 'Zu Händen', service: 'Leistung', qty: 'Menge', unitPrice: 'Einzelpreis', totalHt: 'Gesamt (netto)', subtotal: 'Zwischensumme (netto)', discount: 'Rabatt', subtotalAfterDiscount: 'Zwischensumme nach Rabatt', tax: 'MwSt.', totalTtc: 'Gesamt (brutto)', cii: '↓ Franz. Innovations-Steuergutschrift (CII)', ciiNet: 'Nettokosten nach Steuergutschrift', paymentTermsTitle: 'Zahlungsbedingungen', replyCta: 'Auf dieses Angebot antworten', subject: (ref) => `Ihr Angebot ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>Französische Innovations-Steuergutschrift (CII)DELIVERY Digital ist CII-zertifiziert. Förderfähige französische KMU erhalten ${amount > 0 ? `<strong>${fmt}</strong>` : '20 %'} der Innovationsausgaben zurück.` },
  it: { quote: 'Preventivo', emittedOn: 'Emesso il', validUntil: 'Valido fino al', to: 'Per', service: 'Servizio', qty: 'Quantità', unitPrice: 'Prezzo unitario', totalHt: 'Totale (escl. IVA)', subtotal: 'Subtotale (escl. IVA)', discount: 'Sconto', subtotalAfterDiscount: 'Subtotale dopo sconto', tax: 'IVA', totalTtc: 'Totale (incl. IVA)', cii: '↓ Credito d\'imposta francese CII', ciiNet: 'Costo netto dopo credito', paymentTermsTitle: 'Condizioni di pagamento', replyCta: 'Rispondi a questo preventivo', subject: (ref) => `Il tuo preventivo ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>Credito d'imposta CII (Francia)</strong> - DELIVERY Digital è certificata CII.` },
  pt: { quote: 'Orçamento', emittedOn: 'Emitido em', validUntil: 'Válido até', to: 'Para', service: 'Serviço', qty: 'Quantidade', unitPrice: 'Preço unitário', totalHt: 'Total (sem IVA)', subtotal: 'Subtotal (sem IVA)', discount: 'Desconto', subtotalAfterDiscount: 'Subtotal após desconto', tax: 'IVA', totalTtc: 'Total (com IVA)', cii: '↓ Crédito fiscal francês CII', ciiNet: 'Custo líquido após crédito', paymentTermsTitle: 'Condições de pagamento', replyCta: 'Responder a este orçamento', subject: (ref) => `O seu orçamento ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
};

function getLabels(lang) {
  return LABELS[(lang || 'fr').toLowerCase()] || LABELS.fr;
}

function renderHtml(quote, { publicView = false } = {}) {
  const lang = (quote.language || 'fr').toLowerCase();
  const L = getLabels(lang);
  const ISS = getIssuer(quote);
  const PSCH = getPaymentSchedule(quote);
  const dateLocale = lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : lang === 'de' ? 'de-DE' : lang === 'it' ? 'it-IT' : lang === 'pt' ? 'pt-PT' : 'fr-FR';
  const validDate = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString(dateLocale) : '';
  const today = new Date().toLocaleDateString(dateLocale);
  const publicLink = `${PUBLIC_BASE}/devis/${quote.publicToken}`;
  const cur = (quote.currency || 'EUR').toUpperCase();
  const sec = quote.secondaryCurrency ? quote.secondaryCurrency.toUpperCase() : null;
  const rate = quote.secondaryRate || 1;
  const M = (n) => fmtBoth(n, cur, sec, rate);

  return `<!doctype html>
<html lang="${lang}">
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
  const dateLocale = lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : lang === 'de' ? 'de-DE' : lang === 'it' ? 'it-IT' : lang === 'pt' ? 'pt-PT' : 'fr-FR';
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
function renderDepositInvoicePdf(quote) {
  return new Promise((resolve, reject) => {
    try {
      const D = buildDepositInvoiceData(quote);
      const formatMoney = (n) => {
        try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: D.currency, minimumFractionDigits: 2 }).format(n); }
        catch { return `${n.toFixed(2)} ${D.currency}`; }
      };

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: { Title: `Facture ${D.invoiceRef}`, Author: 'DELIVERY Digital', Subject: `Facture d'acompte ${D.invoiceRef}` },
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
        .text(`FACTURE ${D.invoiceRef}`, right - 200, 52, { width: 200, align: 'right' })
        .text(`Emise le ${D.today}`, { width: 200, align: 'right' })
        .text(`Echeance ${D.dueDate}`, { width: 200, align: 'right' })
        .text(`Devis associe : ${quote.ref || ''}`, { width: 200, align: 'right' });

      doc.moveTo(left, 110).lineTo(right, 110).strokeColor('#E5E5EA').lineWidth(0.5).stroke();

      // Titre
      doc.fillColor('#1D1D1F').font('Helvetica-Bold').fontSize(24).text("Facture d'acompte", left, 130);

      // Bloc client
      const clientY = 175;
      doc.rect(left, clientY, W, 60).fillColor('#F5F5F7').fill();
      doc.fillColor('#86868B').font('Helvetica-Bold').fontSize(8).text("A L'ATTENTION DE", left + 14, clientY + 12);
      doc.fillColor('#1D1D1F').font('Helvetica-Bold').fontSize(13).text(quote.client?.name || '', left + 14, clientY + 26);
      const subline = [quote.client?.company, quote.client?.email, quote.client?.phone].filter(Boolean).join(' · ');
      doc.fillColor('#86868B').font('Helvetica').fontSize(10).text(subline, left + 14, clientY + 45, { width: W - 28 });

      // Tableau prestation
      let y = clientY + 90;
      doc.fillColor('#86868B').font('Helvetica-Bold').fontSize(8)
        .text('PRESTATION', left, y)
        .text('MONTANT HT', right - 120, y, { width: 120, align: 'right' });
      y += 14;
      doc.moveTo(left, y).lineTo(right, y).strokeColor('#E5E5EA').lineWidth(0.5).stroke();
      y += 12;

      doc.fillColor('#1D1D1F').font('Helvetica-Bold').fontSize(12).text(D.acompte.label, left, y);
      doc.fillColor('#86868B').font('Helvetica').fontSize(10).text(
        `${D.acompte.percent} % de ${quote.title || 'Devis'} (ref. ${quote.ref || ''})`,
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
      drawRow('Sous-total HT', formatMoney(D.amountHT));
      drawRow(`TVA (${D.tvaRate} %)`, formatMoney(D.amountTVA));
      doc.moveTo(totalsX, y + 2).lineTo(right, y + 2).strokeColor('#1D1D1F').lineWidth(1).stroke();
      y += 10;
      drawRow('Net a payer', formatMoney(D.amount), true);
      y += 10;

      // RIB
      if (D.bank.iban) {
        doc.rect(left, y, W, 95).fillColor('#F5F5F7').fill();
        doc.fillColor('#86868B').font('Helvetica-Bold').fontSize(8).text('COORDONNEES BANCAIRES', left + 14, y + 12);
        let ry = y + 28;
        const ribRow = (k, v, mono = false) => {
          doc.fillColor('#86868B').font('Helvetica').fontSize(10).text(k, left + 14, ry, { width: 110 });
          doc.fillColor('#1D1D1F').font(mono ? 'Courier' : 'Helvetica-Bold').fontSize(10).text(v, left + 130, ry, { width: W - 144 });
          ry += 14;
        };
        ribRow('Beneficiaire', D.bank.holderName || '');
        if (D.bank.bankName) ribRow('Banque', D.bank.bankName);
        ribRow('IBAN', D.bank.iban, true);
        if (D.bank.bic) ribRow('BIC / SWIFT', D.bank.bic, true);
        doc.fillColor('#86868B').font('Helvetica').fontSize(8.5)
          .text(`Reference a indiquer dans le virement : ${D.invoiceRef}`, left + 14, y + 80);
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
  const ISS = getIssuer(quote);
  const PSCH = getPaymentSchedule(quote);
  const cur = (quote.currency || 'EUR').toUpperCase();
  const sec = quote.secondaryCurrency ? quote.secondaryCurrency.toUpperCase() : null;
  const rate = quote.secondaryRate || 1;
  const M = (n) => fmtBoth(n, cur, sec, rate);
  const dateLocale = lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : lang === 'de' ? 'de-DE' : lang === 'it' ? 'it-IT' : lang === 'pt' ? 'pt-PT' : 'fr-FR';

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
<html lang="${lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Facture ${invoiceRef} - DELIVERY Digital</title>
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
      <div class="ref">Facture ${escapeHtml(invoiceRef)}</div>
      <div>${L.emittedOn} <strong>${today}</strong></div>
      <div>Echeance <strong>${dueDate}</strong></div>
      <div style="margin-top:6px;font-size:11.5px;">Devis associe : <strong>${escapeHtml(quote.ref || '')}</strong></div>
    </div>
  </div>

  <h1>Facture d'acompte</h1>

  <div class="client-block">
    <div class="label">${L.to}</div>
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
        <th style="width:70%">${L.service}</th>
        <th class="num" style="width:30%">${L.totalHt}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="desc-main">${escapeHtml(acompte.label)}</div>
          <div class="desc-details">${acompte.percent} % de ${escapeHtml(quote.title || 'Devis')} (ref. ${escapeHtml(quote.ref || '')})</div>
        </td>
        <td class="num"><strong>${M(amountHT)}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>${L.subtotal}</span><strong>${M(amountHT)}</strong></div>
    <div class="row"><span>${L.tax} (${tvaRate} %)</span><span>${M(amountTVA)}</span></div>
    <div class="row big"><span>Net a payer</span><span>${M(amount)}</span></div>
  </div>

  ${bank.iban ? `
    <div class="rib">
      <div class="label">Coordonnees bancaires</div>
      <div class="row"><span>Beneficiaire</span><span style="font-weight:600;">${escapeHtml(bank.holderName || '')}</span></div>
      ${bank.bankName ? `<div class="row"><span>Banque</span><span>${escapeHtml(bank.bankName)}</span></div>` : ''}
      <div class="row"><span>IBAN</span><span style="font-family:monospace;font-size:13px;">${escapeHtml(bank.iban)}</span></div>
      ${bank.bic ? `<div class="row"><span>BIC / SWIFT</span><span style="font-family:monospace;">${escapeHtml(bank.bic)}</span></div>` : ''}
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #E5E5EA;font-size:12px;color:#86868B;">Reference a indiquer dans le virement : <strong style="color:#1D1D1F;">${escapeHtml(invoiceRef)}</strong></div>
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
};

function renderAcceptanceBlock(quote, L, lang) {
  const A = ACCEPT_LABELS[lang] || ACCEPT_LABELS.fr;
  const dateLocale = lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : lang === 'de' ? 'de-DE' : lang === 'it' ? 'it-IT' : lang === 'pt' ? 'pt-PT' : 'fr-FR';

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
      const pdfBuffer = await renderDepositInvoicePdf(quoteObj);
      const filename = `${D.invoiceRef}.pdf`;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'contact@deliverydigital.fr',
        to: quote.acceptance.signerEmail,
        bcc: 'contact@deliverydigital.fr',
        subject: `Facture d'acompte ${D.invoiceRef} - ${D.acompte.percent} % du devis ${quote.ref}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1D1D1F;">
            <h2 style="margin:0 0 12px;font-family:'Charter','Iowan Old Style',Georgia,serif;font-size:22px;">Merci pour votre confiance.</h2>
            <p style="margin:0 0 14px;font-size:14.5px;line-height:1.55;">Suite a la signature du devis <strong>${quote.ref}</strong>, veuillez trouver en piece jointe la facture d'acompte <strong>${D.invoiceRef}</strong>.</p>
            <p style="margin:0 0 14px;font-size:14.5px;line-height:1.55;">Montant a regler : <strong>${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: D.currency }).format(D.amount)}</strong> (${D.acompte.percent} % du total).</p>
            <p style="margin:0 0 14px;font-size:14.5px;line-height:1.55;">Coordonnees bancaires et reference de virement dans la facture. Echeance : <strong>${D.dueDate}</strong>.</p>
            <p style="margin:24px 0 0;font-size:13px;color:#86868B;">A reception du paiement, nous demarrons le projet.</p>
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
