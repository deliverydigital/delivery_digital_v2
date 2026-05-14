/**
 * Cron quotidien de notification aux moteurs de recherche.
 *
 * Actions effectuees a chaque execution :
 *  1. Ping Google avec l'URL du sitemap (legacy endpoint, best effort)
 *  2. Ping Bing avec l'URL du sitemap (legacy endpoint, best effort)
 *  3. Soumet TOUTES les URLs SEO publiees a IndexNow (officiellement supporte par
 *     Bing, Yandex, Seznam, Naver - Google le considere comme signal mais ne le
 *     supporte pas officiellement).
 *
 * Pourquoi : automatiser la notification des moteurs apres chaque rafraichissement
 * du sitemap, sans intervention manuelle. Complete le fix canonical du 2026-05-14.
 *
 * IndexNow protocol : https://www.indexnow.org/documentation
 *  - Cle = 32 hex chars stockee dans /<key>.txt accessible publiquement
 *  - POST https://api.indexnow.org/indexnow avec batch d'URLs (max 10 000 par appel)
 *
 * @author Rabah Ziane - 2026-05-14
 */
import mongoose from 'mongoose';

const SITE_URL = (process.env.SITE_URL || 'https://deliverydigital.fr').replace(/\/$/, '');
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/delivery_digital';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '050b186c0b74d666189d4afb766d530e';
const INDEXNOW_KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
const HOST = new URL(SITE_URL).host;

// Reuse existing model if registered ailleurs (cas quand seoAgent.js charge models/index.js).
const SeoContent = mongoose.models.SeoContent || mongoose.model('SeoContent', new mongoose.Schema({
  slug: String, type: String, status: String,
}, { collection: 'seocontents' }));

function buildUrl(doc) {
  const slug = doc.slug;
  if (!slug) return null;
  if (doc.type === 'article' || doc.type === 'blog') return `${SITE_URL}/blog/${slug}`;
  if (doc.type === 'faq') return `${SITE_URL}/faq/${slug}`;
  return `${SITE_URL}/services/${slug}`;
}

async function pingGoogle() {
  const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    console.log(`[sitemap-ping] Google ping -> HTTP ${res.status}`);
  } catch (e) {
    console.error('[sitemap-ping] Google ping failed:', e.message);
  }
}

async function pingBing() {
  const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    console.log(`[sitemap-ping] Bing ping -> HTTP ${res.status}`);
  } catch (e) {
    console.error('[sitemap-ping] Bing ping failed:', e.message);
  }
}

async function submitIndexNow(urls) {
  if (!urls.length) {
    console.log('[sitemap-ping] IndexNow : aucune URL a soumettre.');
    return;
  }
  // IndexNow accepte 10 000 URLs max par appel, on split par paquets de 1000 par securite.
  const BATCH = 1000;
  for (let i = 0; i < urls.length; i += BATCH) {
    const slice = urls.slice(i, i + BATCH);
    const body = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: slice,
    };
    try {
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      console.log(`[sitemap-ping] IndexNow batch ${i / BATCH + 1} (${slice.length} URLs) -> HTTP ${res.status} ${text ? text.slice(0, 100) : ''}`);
    } catch (e) {
      console.error('[sitemap-ping] IndexNow batch failed:', e.message);
    }
  }
}

export async function pingAllEngines() {
  console.log('[sitemap-ping] Demarrage cron daily ping...');
  console.log('[sitemap-ping] SITE_URL:', SITE_URL);
  console.log('[sitemap-ping] SITEMAP:', SITEMAP_URL);

  // 1. Ping Google et Bing en parallele.
  await Promise.allSettled([pingGoogle(), pingBing()]);

  // 2. Recupere les URLs SEO publiees.
  let urls = [];
  try {
    const docs = await SeoContent.find({ status: 'published' }, { slug: 1, type: 1 }).lean();
    urls = docs.map(buildUrl).filter(Boolean);
    console.log(`[sitemap-ping] Total URLs candidates IndexNow : ${urls.length}`);
  } catch (e) {
    console.error('[sitemap-ping] Mongo query failed:', e.message);
  }

  // 3. IndexNow batch.
  await submitIndexNow(urls);

  console.log('[sitemap-ping] Termine.');
}

// CLI mode : node server/scripts/sitemap-ping.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      await pingAllEngines();
      await mongoose.disconnect();
      process.exit(0);
    } catch (e) {
      console.error('[sitemap-ping] FATAL:', e);
      process.exit(1);
    }
  })();
}
