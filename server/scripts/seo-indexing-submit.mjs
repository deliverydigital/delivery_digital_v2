/**
 * Soumet les URLs SEO publiees a Google Indexing API en bulk.
 *
 * Usage:
 *   node server/scripts/seo-indexing-submit.mjs [--limit=10] [--dry] [--filter=services] [--type=URL_UPDATED|URL_DELETED]
 *
 * Prerequis (cote user, fait dans Google Cloud + Search Console) :
 *  1. Activer Indexing API dans Google Cloud Console (https://console.cloud.google.com/apis/library/indexing.googleapis.com)
 *  2. Creer un Service Account, generer une cle JSON
 *  3. Dans Google Search Console (deliverydigital.fr) :
 *     - Parametres -> Utilisateurs et autorisations -> Ajouter un utilisateur
 *     - Email = celui du Service Account (xxx@yyy.iam.gserviceaccount.com)
 *     - Autorisation = Proprietaire (sinon "permission denied")
 *  4. Uploader la cle JSON sur le serveur a :
 *     /home/ubuntu/deliverydigital-main-web-app/deliverydigital-web-app/config/google-indexing-key.json
 *     (chmod 600 ; ne PAS committer)
 *
 * Quota Google Indexing API par defaut : 200 requetes / minute, 1 000 / jour.
 * Le script auto-throttle a 90 req/min pour rester safe.
 *
 * Note : Indexing API est officiellement supportee pour JobPosting / BroadcastEvent
 * uniquement. Pour les autres pages (city-service / blog), ca marche en pratique avec
 * un taux de succes variable. Combiner avec sitemap GSC pour fiabilite.
 *
 * @author Rabah Ziane - 2026-05-14
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { JWT } from 'google-auth-library';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY_PATH = process.env.GOOGLE_INDEXING_KEY_FILE
  || path.resolve(__dirname, '../../config/google-indexing-key.json');
const SITE_URL = (process.env.SITE_URL || 'https://deliverydigital.fr').replace(/\/$/, '');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/delivery_digital';
const INDEXING_ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const SCOPES = ['https://www.googleapis.com/auth/indexing'];

// Auto-throttle pour rester sous 200 req/min (default quota). Cible : 90 req/min.
const REQ_INTERVAL_MS = 700;

// Parse CLI args.
const args = process.argv.slice(2).reduce((acc, raw) => {
  const m = raw.match(/^--([^=]+)=?(.*)$/);
  if (m) acc[m[1]] = m[2] || true;
  return acc;
}, {});
const LIMIT = args.limit ? parseInt(args.limit, 10) : null;
const DRY = !!args.dry;
const FILTER = args.filter || null; // ex 'services', 'blog'
const TYPE = args.type || 'URL_UPDATED'; // ou URL_DELETED

const SeoContent = mongoose.model('SeoContent', new mongoose.Schema({
  slug: String, type: String, status: String,
}, { collection: 'seocontents' }));

function buildUrl(doc) {
  const slug = doc.slug;
  if (!slug) return null;
  if (doc.type === 'article' || doc.type === 'blog') return `${SITE_URL}/blog/${slug}`;
  if (doc.type === 'faq') return `${SITE_URL}/faq/${slug}`;
  // Par defaut city-service ou autres : /services/<slug>
  return `${SITE_URL}/services/${slug}`;
}

async function loadKey() {
  try {
    const json = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
    return json;
  } catch (e) {
    console.error(`[indexing] Cle service account introuvable : ${KEY_PATH}`);
    console.error('[indexing] Definir GOOGLE_INDEXING_KEY_FILE ou uploader la cle JSON.');
    process.exit(2);
  }
}

async function getAccessToken(key) {
  const client = new JWT({ email: key.client_email, key: key.private_key, scopes: SCOPES });
  const { token } = await client.getAccessToken();
  return token;
}

async function submitUrl(token, url, type) {
  const res = await fetch(INDEXING_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url, type }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  console.log('[indexing] Demarrage...');
  console.log('[indexing] SITE_URL:', SITE_URL);
  console.log('[indexing] TYPE:', TYPE, '| DRY:', DRY, '| LIMIT:', LIMIT || 'all', '| FILTER:', FILTER || 'all');

  const key = await loadKey();
  console.log('[indexing] Service account:', key.client_email);

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('[indexing] Mongo connecte.');

  const query = { status: 'published' };
  let docs = await SeoContent.find(query, { slug: 1, type: 1 }).lean();
  if (FILTER === 'services') docs = docs.filter((d) => d.type === 'city-service' || !d.type);
  else if (FILTER === 'blog') docs = docs.filter((d) => d.type === 'article' || d.type === 'blog');
  else if (FILTER === 'faq') docs = docs.filter((d) => d.type === 'faq');

  const urls = docs.map(buildUrl).filter(Boolean);
  console.log(`[indexing] Total URLs a soumettre : ${urls.length}`);

  const targetUrls = LIMIT ? urls.slice(0, LIMIT) : urls;

  if (DRY) {
    console.log('[indexing] DRY RUN - aperçu 10 premieres URLs :');
    targetUrls.slice(0, 10).forEach((u) => console.log('  ', u));
    await mongoose.disconnect();
    return;
  }

  const token = await getAccessToken(key);
  console.log('[indexing] Token OAuth obtenu.');

  let ok = 0, ko = 0;
  for (let i = 0; i < targetUrls.length; i++) {
    const u = targetUrls[i];
    const r = await submitUrl(token, u, TYPE);
    if (r.ok) {
      ok++;
      console.log(`[${i + 1}/${targetUrls.length}] OK ${u}`);
    } else {
      ko++;
      console.error(`[${i + 1}/${targetUrls.length}] FAIL ${r.status} ${u} - ${r.body.slice(0, 200)}`);
    }
    if (i < targetUrls.length - 1) await sleep(REQ_INTERVAL_MS);
  }

  console.log(`\n[indexing] Termine. OK=${ok} | FAIL=${ko} | Total=${targetUrls.length}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('[indexing] FATAL:', e);
  process.exit(1);
});
