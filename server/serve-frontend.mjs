/**
 * Serveur frontend statique avec injection SEO dynamique.
 *
 * Remplace `vite preview` pour le pm2 process `deliverydigital-main-web`. Sert dist/
 * en static mais intercepte les routes SEO (/services/:slug, /blog/:slug) pour
 * remplacer DANS LE HTML avant envoi :
 *   - <link rel="canonical"> -> URL specifique de la page (au lieu de homepage)
 *   - <title> -> metaTitle de la page (au lieu du title generique)
 *   - <meta name="description"> -> metaDescription de la page
 *   - JSON-LD structured data injecte avant </head> si dispo
 *
 * Pourquoi : Google Search Console (snapshot 2026-05-14) montrait 869/879 pages
 * en "Page en double : Google a choisi un canonical different" car le canonical
 * etait hardcode `https://deliverydigital.fr/` pour TOUTES les routes (index.html
 * Vite SPA). Bug fatal pour l'indexation des pages SEO.
 *
 * @author Rabah Ziane - 2026-05-14
 */
import express from 'express';
import { readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist');
const PORT = parseInt(process.env.FRONTEND_PORT || process.env.PORT || '8080', 10);
const SITE_URL = (process.env.SITE_URL || 'https://deliverydigital.fr').replace(/\/$/, '');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/delivery_digital';

// Schema minimal pour seocontents - on lit juste les champs SEO necessaires.
const SeoContentSchema = new mongoose.Schema({
  slug: String,
  type: String,
  status: String,
  title: String,
  metaTitle: String,
  metaDescription: String,
  jsonLd: mongoose.Schema.Types.Mixed,
}, { collection: 'seocontents' });
const SeoContent = mongoose.model('SeoContent', SeoContentSchema);

// Cache en memoire des pages SEO (cle = slug) pour eviter de tap Mongo a chaque req.
// Invalide a chaque rechargement complet ou apres 5min.
const SEO_CACHE = new Map();
let CACHE_BUILT_AT = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadSeoCache() {
  const docs = await SeoContent.find({ status: 'published' }, { slug: 1, type: 1, title: 1, metaTitle: 1, metaDescription: 1, jsonLd: 1 }).lean();
  SEO_CACHE.clear();
  for (const d of docs) {
    if (d.slug) SEO_CACHE.set(d.slug, d);
  }
  CACHE_BUILT_AT = Date.now();
  console.log(`[serve-frontend] SEO cache loaded : ${SEO_CACHE.size} pages.`);
}

async function getSeoBySlug(slug) {
  if (Date.now() - CACHE_BUILT_AT > CACHE_TTL_MS) {
    try { await loadSeoCache(); } catch (e) { console.error('[serve-frontend] cache reload failed:', e.message); }
  }
  return SEO_CACHE.get(slug) || null;
}

// Echappe pour insertion safe dans HTML (attribut ou contenu de balise).
function htmlEscape(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Lit index.html une fois (devrait suffire en prod, on rechargera si fichier change).
let INDEX_HTML_CACHE = null;
let INDEX_HTML_MTIME = 0;
function readIndexHtml() {
  const stat = statSync(path.join(DIST, 'index.html'));
  if (!INDEX_HTML_CACHE || stat.mtimeMs !== INDEX_HTML_MTIME) {
    INDEX_HTML_CACHE = readFileSync(path.join(DIST, 'index.html'), 'utf8');
    INDEX_HTML_MTIME = stat.mtimeMs;
  }
  return INDEX_HTML_CACHE;
}

/**
 * Injecte canonical / title / description / json-ld dans le HTML pour une page SEO.
 * Idempotent : remplace les balises existantes si presentes, sinon les insere.
 */
function injectSeo(html, { canonicalUrl, title, description, jsonLd }) {
  let out = html;

  // canonical : remplace l'existant (toujours present dans index.html).
  out = out.replace(
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${htmlEscape(canonicalUrl)}" />`,
  );

  // title : remplace le contenu de la balise.
  if (title) {
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${htmlEscape(title)}</title>`);
  }

  // meta description : remplace si presente, sinon ajoute avant </head>.
  if (description) {
    if (/<meta\s+name=["']description["'][^>]*>/i.test(out)) {
      out = out.replace(
        /<meta\s+name=["']description["'][^>]*>/i,
        `<meta name="description" content="${htmlEscape(description)}" />`,
      );
    } else {
      out = out.replace('</head>', `  <meta name="description" content="${htmlEscape(description)}" />\n  </head>`);
    }
  }

  // Open Graph url + title (utile pour partage social et signaux SEO).
  out = out.replace(
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${htmlEscape(canonicalUrl)}" />`,
  );
  if (title) {
    out = out.replace(
      /<meta\s+property=["']og:title["'][^>]*>/i,
      `<meta property="og:title" content="${htmlEscape(title)}" />`,
    );
  }
  if (description) {
    out = out.replace(
      /<meta\s+property=["']og:description["'][^>]*>/i,
      `<meta property="og:description" content="${htmlEscape(description)}" />`,
    );
  }

  // JSON-LD structured data : injecte avant </head> si dispo.
  if (jsonLd && typeof jsonLd === 'object') {
    try {
      const safe = JSON.stringify(jsonLd).replace(/<\/script>/gi, '<\\/script>');
      out = out.replace('</head>', `  <script type="application/ld+json">${safe}</script>\n  </head>`);
    } catch { /* skip */ }
  }

  return out;
}

const app = express();

// 0) Proxy vers l'API Express (port 3008) pour /api, /sitemap.xml, /robots.txt, /llms*.txt, /devis.
// Reprend la config qu'avait vite.config.ts dans `preview.proxy`. Sans ce proxy, les requetes
// /api/admin/conversations tombent dans le catch-all SPA et recoivent du HTML au lieu de JSON.
// On utilise http.request natif (plus fiable que http-proxy-middleware avec express).
// @author Rabah Ziane - 2026-05-14
const PROXY_PREFIXES = ['/api', '/sitemap.xml', '/robots.txt', '/llms.txt', '/llms-full.txt', '/devis'];
function shouldProxy(reqPath) {
  return PROXY_PREFIXES.some((p) => reqPath === p || reqPath.startsWith(p + '/') || reqPath.startsWith(p + '?'));
}
function proxyToApi(req, res) {
  const options = {
    host: '127.0.0.1',
    port: 3008,
    path: req.originalUrl,
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:3008' },
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    console.error('[proxy] error:', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'bad_gateway', message: err.message });
  });
  req.pipe(proxyReq);
}
app.use((req, res, next) => {
  if (shouldProxy(req.path)) return proxyToApi(req, res);
  next();
});

// 1a) Hub /services et /services/country/:code : meta SSR dedies pour ne pas
// que Google voit ces hubs comme duplicate du / homepage.
// @author Rabah Ziane - 2026-05-19
const COUNTRY_NAMES_HUB = {
  FR: 'France', SA: 'Arabie Saoudite', QA: 'Qatar', AE: 'Émirats Arabes Unis',
  KW: 'Koweït', OM: 'Oman', BH: 'Bahreïn', MC: 'Monaco', GULF: 'Golfe',
};
app.get('/services', (req, res) => {
  const html = readIndexHtml();
  const injected = injectSeo(html, {
    canonicalUrl: `${SITE_URL}/services`,
    title: 'Services & expertises - Agence DELIVERY Digital',
    description: 'Découvrez nos services par ville et par pays : développement web, SaaS, mobile, IA, cloud. Plus de 800 pages dédiées aux entreprises en France et dans le Golfe.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Services DELIVERY Digital par ville et pays',
      url: `${SITE_URL}/services`,
      description: 'Pages dédiées aux services de développement web, mobile, SaaS, IA et cloud, par ville et pays.',
    },
  });
  res.status(200).type('html').send(injected);
});
app.get('/services/country/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const countryName = COUNTRY_NAMES_HUB[code] || code;
  const html = readIndexHtml();
  const injected = injectSeo(html, {
    canonicalUrl: `${SITE_URL}/services/country/${code.toLowerCase()}`,
    title: `Services en ${countryName} - DELIVERY Digital`,
    description: `Tous nos services dédiés aux entreprises en ${countryName} : développement web, SaaS, mobile, IA, cloud. Stack moderne, équipe senior.`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Services DELIVERY Digital en ${countryName}`,
      url: `${SITE_URL}/services/country/${code.toLowerCase()}`,
      about: { '@type': 'Country', name: countryName },
    },
  });
  res.status(200).type('html').send(injected);
});

// 1b) Routes SEO injectees : doivent etre AVANT le static car index.html serait servi tel quel.
const seoRoutes = ['/services/:slug', '/blog/:slug'];
for (const route of seoRoutes) {
  app.get(route, async (req, res, next) => {
    try {
      const slug = req.params.slug;
      const seo = await getSeoBySlug(slug);
      const html = readIndexHtml();
      if (!seo) {
        // Pas en DB : sert index.html standard (SPA prendra le relais cote client).
        return res.status(200).type('html').send(html);
      }
      const canonicalUrl = `${SITE_URL}${req.path}`;
      const title = seo.metaTitle || seo.title;
      const description = seo.metaDescription;
      const injected = injectSeo(html, { canonicalUrl, title, description, jsonLd: seo.jsonLd });
      res.status(200).type('html').send(injected);
    } catch (e) {
      console.error('[serve-frontend] SEO route error:', e.message);
      next();
    }
  });
}

// 2) Static : sert tous les assets (CSS, JS, images, favicons, sitemap.xml...).
// Fichiers uploadés (RIB agences, assets de marque) servis depuis le vrai dossier uploads/.
// @author Rabah Ziane - 2026-06-05
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), { maxAge: '1h' }));
app.use(express.static(DIST, { index: false, maxAge: '1h', etag: true }));

// 3) Catch-all SPA : sert index.html pour toute autre route (canonical homepage est OK).
app.get('*', (req, res) => {
  // index.html toujours revalidé (évite un index périmé pointant vers un bundle JS supprimé). @Rabah 2026-06-06
  res.set('Cache-Control', 'no-cache');
  res.status(200).type('html').send(readIndexHtml());
});

async function start() {
  console.log('[serve-frontend] starting...');
  console.log('[serve-frontend] DIST:', DIST);
  console.log('[serve-frontend] SITE_URL:', SITE_URL);
  console.log('[serve-frontend] MONGO_URI:', MONGO_URI);

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('[serve-frontend] mongoose connected.');
    await loadSeoCache();
  } catch (e) {
    console.error('[serve-frontend] mongo init failed (continuing without SEO injection):', e.message);
  }

  app.listen(PORT, () => {
    console.log(`[serve-frontend] listening on :${PORT}`);
  });
}

start().catch((e) => {
  console.error('[serve-frontend] fatal:', e);
  process.exit(1);
});
