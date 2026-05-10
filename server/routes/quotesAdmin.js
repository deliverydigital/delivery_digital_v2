import express from 'express';
import nodemailer from 'nodemailer';
import { QuickQuote } from '../models/index.js';

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
      { id: 'site-vitrine', label: 'Site vitrine sur mesure', defaultPrice: 4500, unit: 'forfait', description: 'Site corporate sur mesure (5-8 pages), CMS administrable, responsive, optimise SEO.' },
      { id: 'site-saas', label: 'Plateforme SaaS / dashboard', defaultPrice: 18000, unit: 'forfait', description: 'Application web complete : auth, dashboard, base de donnees, deploiement.' },
      { id: 'app-mobile', label: 'Application mobile iOS + Android', defaultPrice: 24000, unit: 'forfait', description: 'App mobile native (React Native), 2 stores, notifications, base de donnees.' },
      { id: 'crm-sur-mesure', label: 'CRM / ERP sur mesure', defaultPrice: 22000, unit: 'forfait', description: 'Logiciel metier, gestion clients/projets/factures, automatisations, export.' },
      { id: 'integration-api', label: 'Integration API / connecteur', defaultPrice: 3500, unit: 'forfait', description: 'Connexion entre vos outils existants, automatisation des flux de donnees.' },
      { id: 'cloud-devops', label: 'Mise en place Cloud / DevOps', defaultPrice: 4500, unit: 'forfait', description: 'AWS, CI/CD, monitoring, scalabilite, securite.' },
      { id: 'maintenance', label: 'Maintenance mensuelle', defaultPrice: 800, unit: 'mois', description: 'Mises a jour, surveillance, corrections de bugs, evolutions mineures.' },
      { id: 'audit-tech', label: 'Audit technique', defaultPrice: 1500, unit: 'forfait', description: 'Revue complete du code, securite, performance, recommandations.' },
      { id: 'refonte', label: 'Refonte de site existant', defaultPrice: 8500, unit: 'forfait', description: 'Reprise, migration, modernisation d\'un site existant.' },
      { id: 'ia-integration', label: 'Integration IA / Claude', defaultPrice: 6500, unit: 'forfait', description: 'Chatbot, agent conversationnel, analyse de documents, generation automatique.' },
      { id: 'design-ui-ux', label: 'Design UI / UX', defaultPrice: 3500, unit: 'forfait', description: 'Maquettes Figma, prototype, design system, parcours utilisateurs.' },
      { id: 'formation', label: 'Formation equipe technique', defaultPrice: 1200, unit: 'jour', description: 'Formation sur mesure pour vos equipes (React, Node, AWS, ...).' },
    ],
  });
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
    const allowed = ['client', 'title', 'intro', 'lines', 'taxRate', 'ciiEligible', 'validUntil', 'notes', 'prospectId', 'status'];
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
function fmtEur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
}

function renderHtml(quote, { publicView = false } = {}) {
  const validDate = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('fr-FR') : '';
  const today = new Date().toLocaleDateString('fr-FR');
  const publicLink = `${PUBLIC_BASE}/devis/${quote.publicToken}`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Devis ${quote.ref} - DELIVERY Digital</title>
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
      <div class="ref">Devis ${quote.ref}</div>
      <div>Émis le <strong>${today}</strong></div>
      ${validDate ? `<div>Valable jusqu'au <strong>${validDate}</strong></div>` : ''}
    </div>
  </div>

  <h1>${escapeHtml(quote.title || 'Devis')}</h1>

  <div class="client-block">
    <div class="label">À l'attention de</div>
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
        <th style="width:50%">Prestation</th>
        <th class="num" style="width:80px">Quantité</th>
        <th class="num" style="width:120px">Prix unitaire</th>
        <th class="num" style="width:120px">Total HT</th>
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
          <td class="num">${fmtEur(l.unitPrice)}</td>
          <td class="num"><strong>${fmtEur((l.quantity || 1) * (l.unitPrice || 0))}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Sous-total HT</span><strong>${fmtEur(quote.subtotal)}</strong></div>
    <div class="row"><span>TVA (${quote.taxRate} %)</span><span>${fmtEur(quote.taxAmount)}</span></div>
    <div class="row big"><span>Total TTC</span><span>${fmtEur(quote.totalTTC)}</span></div>
    ${quote.ciiEligible && quote.ciiAmount > 0 ? `
      <div class="row cii"><span>↓ Crédit Impôt Innovation</span><span>-${fmtEur(quote.ciiAmount)}</span></div>
      <div class="row big"><span>Coût net après CII</span><span>${fmtEur(quote.totalTTC - quote.ciiAmount)}</span></div>
    ` : ''}
  </div>

  ${quote.ciiEligible ? `
    <div class="cii-block">
      <strong>Crédit Impôt Innovation (CII)</strong> — DELIVERY Digital est certifié CII. Pour les PME françaises éligibles, ${quote.ciiAmount > 0 ? `<strong>${fmtEur(quote.ciiAmount)}</strong> seront récupérés` : '20 % des dépenses d\'innovation seront récupérés'} via ce dispositif fiscal (plafond annuel : 400 000 € de dépenses, soit 80 000 € de crédit max).
    </div>
  ` : ''}

  ${quote.notes ? `<div class="notes">${escapeHtml(quote.notes).replace(/\n/g, '<br/>')}</div>` : ''}

  ${publicView ? `
    <div class="cta">
      <a href="mailto:contact@deliverydigital.fr?subject=Devis ${quote.ref} - réponse">Répondre à ce devis</a>
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

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'contact@deliverydigital.fr',
      to: quote.client.email,
      bcc: 'contact@deliverydigital.fr',
      subject: `Votre devis ${quote.ref} - DELIVERY Digital`,
      html: html + `<p style="text-align:center;font-size:12px;color:#86868B;padding:20px;">Ce devis est aussi consultable en ligne : <a href="${publicLink}">${publicLink}</a></p>`,
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
