import express from 'express';
import nodemailer from 'nodemailer';
import Anthropic from '@anthropic-ai/sdk';
import { QuickQuote } from '../models/index.js';

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
    const allowed = ['client', 'title', 'intro', 'lines', 'taxRate', 'ciiEligible', 'validUntil', 'notes', 'prospectId', 'status', 'currency', 'secondaryCurrency', 'secondaryRate', 'discountType', 'discountValue', 'language'];
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

const LABELS = {
  fr: { quote: 'Devis', emittedOn: 'Émis le', validUntil: 'Valable jusqu\'au', to: 'À l\'attention de', service: 'Prestation', qty: 'Quantité', unitPrice: 'Prix unitaire', totalHt: 'Total HT', subtotal: 'Sous-total HT', discount: 'Réduction', subtotalAfterDiscount: 'Sous-total après remise', tax: 'TVA', totalTtc: 'Total TTC', cii: '↓ Crédit Impôt Innovation', ciiNet: 'Coût net après CII', replyCta: 'Répondre à ce devis', subject: (ref) => `Votre devis ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>Crédit Impôt Innovation (CII)</strong> — DELIVERY Digital est certifié CII. Pour les PME françaises éligibles, ${amount > 0 ? `<strong>${fmt}</strong> seront récupérés` : '20 % des dépenses d\'innovation seront récupérés'} via ce dispositif fiscal (plafond annuel : 400 000 € de dépenses, soit 80 000 € de crédit max).` },
  en: { quote: 'Quote', emittedOn: 'Issued on', validUntil: 'Valid until', to: 'For', service: 'Service', qty: 'Quantity', unitPrice: 'Unit price', totalHt: 'Total (excl. tax)', subtotal: 'Subtotal (excl. tax)', discount: 'Discount', subtotalAfterDiscount: 'Subtotal after discount', tax: 'VAT', totalTtc: 'Total (incl. tax)', cii: '↓ French Innovation Tax Credit (CII)', ciiNet: 'Net cost after tax credit', replyCta: 'Reply to this quote', subject: (ref) => `Your quote ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>French Innovation Tax Credit (CII)</strong> — DELIVERY Digital is CII-certified. Eligible French SMEs can recover ${amount > 0 ? `<strong>${fmt}</strong>` : '20 % of innovation expenses'} via this tax mechanism (yearly cap: 400,000 EUR of eligible expenses, max 80,000 EUR credit).` },
  es: { quote: 'Presupuesto', emittedOn: 'Emitido el', validUntil: 'Válido hasta', to: 'Para', service: 'Servicio', qty: 'Cantidad', unitPrice: 'Precio unitario', totalHt: 'Total (sin IVA)', subtotal: 'Subtotal (sin IVA)', discount: 'Descuento', subtotalAfterDiscount: 'Subtotal después del descuento', tax: 'IVA', totalTtc: 'Total (con IVA)', cii: '↓ Crédito fiscal francés CII', ciiNet: 'Coste neto tras crédito', replyCta: 'Responder a esta cotización', subject: (ref) => `Su presupuesto ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>Crédito fiscal CII (Francia)</strong> — DELIVERY Digital está certificado CII. Las PYMEs francesas elegibles recuperan ${amount > 0 ? `<strong>${fmt}</strong>` : '20 %'} a través de este dispositivo fiscal (límite anual : 400 000 EUR de gastos elegibles).` },
  de: { quote: 'Angebot', emittedOn: 'Ausgestellt am', validUntil: 'Gültig bis', to: 'Zu Händen', service: 'Leistung', qty: 'Menge', unitPrice: 'Einzelpreis', totalHt: 'Gesamt (netto)', subtotal: 'Zwischensumme (netto)', discount: 'Rabatt', subtotalAfterDiscount: 'Zwischensumme nach Rabatt', tax: 'MwSt.', totalTtc: 'Gesamt (brutto)', cii: '↓ Franz. Innovations-Steuergutschrift (CII)', ciiNet: 'Nettokosten nach Steuergutschrift', replyCta: 'Auf dieses Angebot antworten', subject: (ref) => `Ihr Angebot ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>Französische Innovations-Steuergutschrift (CII)</strong> — DELIVERY Digital ist CII-zertifiziert. Förderfähige französische KMU erhalten ${amount > 0 ? `<strong>${fmt}</strong>` : '20 %'} der Innovationsausgaben zurück.` },
  it: { quote: 'Preventivo', emittedOn: 'Emesso il', validUntil: 'Valido fino al', to: 'Per', service: 'Servizio', qty: 'Quantità', unitPrice: 'Prezzo unitario', totalHt: 'Totale (escl. IVA)', subtotal: 'Subtotale (escl. IVA)', discount: 'Sconto', subtotalAfterDiscount: 'Subtotale dopo sconto', tax: 'IVA', totalTtc: 'Totale (incl. IVA)', cii: '↓ Credito d\'imposta francese CII', ciiNet: 'Costo netto dopo credito', replyCta: 'Rispondi a questo preventivo', subject: (ref) => `Il tuo preventivo ${ref} - DELIVERY Digital`, ciiBlock: (amount, fmt) => `<strong>Credito d'imposta CII (Francia)</strong> — DELIVERY Digital è certificata CII.` },
  pt: { quote: 'Orçamento', emittedOn: 'Emitido em', validUntil: 'Válido até', to: 'Para', service: 'Serviço', qty: 'Quantidade', unitPrice: 'Preço unitário', totalHt: 'Total (sem IVA)', subtotal: 'Subtotal (sem IVA)', discount: 'Desconto', subtotalAfterDiscount: 'Subtotal após desconto', tax: 'IVA', totalTtc: 'Total (com IVA)', cii: '↓ Crédito fiscal francês CII', ciiNet: 'Custo líquido após crédito', replyCta: 'Responder a este orçamento', subject: (ref) => `O seu orçamento ${ref} - DELIVERY Digital`, ciiBlock: () => '' },
};

function getLabels(lang) {
  return LABELS[(lang || 'fr').toLowerCase()] || LABELS.fr;
}

function renderHtml(quote, { publicView = false } = {}) {
  const lang = (quote.language || 'fr').toLowerCase();
  const L = getLabels(lang);
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

  ${quote.notes ? `<div class="notes">${escapeHtml(quote.notes).replace(/\n/g, '<br/>')}</div>` : ''}

  ${publicView ? `
    <div class="cta">
      <a href="mailto:contact@deliverydigital.fr?subject=${encodeURIComponent(L.quote + ' ' + quote.ref)}">${L.replyCta}</a>
    </div>
  ` : ''}

  <div class="footer">
    DELIVERY Digital Technology · 470 promenade des Anglais, 06200 Nice<br/>
    SIRET 902 945 195 00029 · RCS Nice · NAF 6201Z · TVA FR 42902945195<br/>
    contact@deliverydigital.fr · +33 7 49 70 77 73 · deliverydigital.fr
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
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
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'contact@deliverydigital.fr',
      to: quote.client.email,
      bcc: 'contact@deliverydigital.fr',
      subject: L.subject(quote.ref),
      html: html + `<p style="text-align:center;font-size:12px;color:#86868B;padding:20px;"><a href="${publicLink}">${publicLink}</a></p>`,
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

export default router;
export { publicRouter as publicQuotesRouter };
