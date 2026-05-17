/**
 * SEO agent worker - cree des DRAFTS en continu, JAMAIS de publish automatique.
 *
 * Strategie (phase 1 : Golfe en EN) :
 *  - Cron 9h et 15h Europe/Paris : genere 1 landing draft (ville × service) du pool QA+SA
 *  - Cron lundi 8h : genere 1 blog article draft (topic Gulf)
 *  - Cron dimanche 22h : audit deterministe des pages publiees, log dans console + DB
 *  - Idempotent : si toutes les combinaisons existent deja (meme en draft), skip
 *  - Au boot : run 1× immediat si <= 0 draft pending (kickstart)
 *
 * @author Rabah Ziane - 2026-05-13
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import cron from 'node-cron';
import { SeoContent } from '../models/index.js';
import { generateLandingDraft, generateBlogDraft, BLOG_TOPIC_COUNT } from '../seo/templates-gulf.js';
import { generateLandingDraftFr } from '../seo/templates-fr.js';
import { pingAllEngines } from '../scripts/sitemap-ping.mjs';
import { auditAllPublished } from '../seo/audit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../data');

const CITIES_GULF = JSON.parse(readFileSync(resolve(DATA_DIR, 'cities-gulf.json'), 'utf8'));
const SERVICES_GULF = JSON.parse(readFileSync(resolve(DATA_DIR, 'services-gulf-en.json'), 'utf8'));
const CITIES_FR = JSON.parse(readFileSync(resolve(DATA_DIR, 'cities-fr.json'), 'utf8'));
const SERVICES_FR = JSON.parse(readFileSync(resolve(DATA_DIR, 'services.json'), 'utf8'));
// Combinaisons {city, service, isFr} a generer.
const ALL_COMBOS = [
  ...CITIES_GULF.flatMap((c) => SERVICES_GULF.map((s) => ({ city: c, service: s, lang: 'en' }))),
  ...CITIES_FR.flatMap((c) => SERVICES_FR.map((s) => ({ city: c, service: s, lang: 'fr' }))),
];

/** Slug attendu pour un combo (city, service, lang). */
function comboSlug({ city, service, lang }) {
  if (lang === 'fr') return `${service.key}-${city.slug}`;
  return `${service.key}-${city.slug}-${city.country.toLowerCase()}`;
}

/** Choisit la prochaine combinaison ville x service x lang jamais combinee en draft/published. */
async function pickNextLandingCombo() {
  const existing = await SeoContent.find({ type: 'city-service' }).select('slug').lean();
  const taken = new Set(existing.map((e) => e.slug));
  const candidates = ALL_COMBOS.filter((c) => !taken.has(comboSlug(c)));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function generateOneLanding(reason = 'cron') {
  const combo = await pickNextLandingCombo();
  if (!combo) {
    console.log(`[seo-agent] ${reason}: all landing combos done (pool exhausted).`);
    return null;
  }
  const { city, service, lang } = combo;
  try {
    const draft = lang === 'fr'
      ? generateLandingDraftFr({ city, service })
      : generateLandingDraft({ city, service });
    const saved = await SeoContent.create(draft);
    console.log(`[seo-agent] ${reason}: draft landing created ${saved.slug} (${city.country}/${lang})`);
    return saved;
  } catch (err) {
    console.error(`[seo-agent] ${reason}: failed for ${city.slug}/${service.key}/${lang} - ${err.message}`);
    return null;
  }
}

/** Tourne sur les topics blog en boucle, en evitant ceux deja drafted. */
async function generateOneBlog(reason = 'cron') {
  const existing = await SeoContent.find({ type: 'article' }).select('slug').lean();
  const taken = new Set(existing.map((e) => e.slug));

  for (let i = 0; i < BLOG_TOPIC_COUNT; i++) {
    const draft = generateBlogDraft({ topicIndex: i });
    if (!taken.has(draft.slug)) {
      try {
        const saved = await SeoContent.create(draft);
        console.log(`[seo-agent] ${reason}: draft blog created ${saved.slug}`);
        return saved;
      } catch (err) {
        console.error(`[seo-agent] ${reason}: blog failed ${draft.slug} - ${err.message}`);
      }
    }
  }
  console.log(`[seo-agent] ${reason}: all blog topics already drafted.`);
  return null;
}

async function runWeeklyAudit(reason = 'cron') {
  try {
    const audit = await auditAllPublished(SeoContent);
    console.log(`[seo-agent] ${reason}: audit summary`, JSON.stringify(audit.summary));
    const bad = audit.results.filter((r) => r.issues.length > 0);
    if (bad.length > 0) {
      console.log(`[seo-agent] ${reason}: pages with issues:`);
      for (const r of bad.slice(0, 10)) {
        console.log(`  - ${r.slug}: score=${r.score} issues=${r.issues.join(', ')}`);
      }
    }
    return audit;
  } catch (err) {
    console.error(`[seo-agent] ${reason}: audit failed - ${err.message}`);
  }
}

export function startSeoAgent() {
  if (process.env.SEO_AGENT_DISABLED === '1') {
    console.log('[seo-agent] disabled via SEO_AGENT_DISABLED=1');
    return;
  }

  // Cron : 2 landings/jour
  cron.schedule('0 9 * * *', () => generateOneLanding('cron-9h'), { timezone: 'Europe/Paris' });
  cron.schedule('0 15 * * *', () => generateOneLanding('cron-15h'), { timezone: 'Europe/Paris' });

  // Blog : lundi 8h
  cron.schedule('0 8 * * 1', () => generateOneBlog('cron-blog'), { timezone: 'Europe/Paris' });

  // Audit : dimanche 22h
  cron.schedule('0 22 * * 0', () => runWeeklyAudit('cron-audit'), { timezone: 'Europe/Paris' });

  // Daily 4h : ping moteurs de recherche (IndexNow + sitemap) pour forcer re-crawl.
  // @author Rabah Ziane - 2026-05-14
  cron.schedule('0 4 * * *', () => {
    pingAllEngines().catch((e) => console.error('[seo-agent] daily ping failed:', e.message));
  }, { timezone: 'Europe/Paris' });

  console.log('[seo-agent] cron scheduled (2 landings/day + 1 blog/week + audit Sunday).');

  // Daily 10h Paris : ping Google Indexing API 200 URLs/jour (apres reset quota a 9h Paris).
  // @author Rabah Ziane - 2026-05-17
  if (process.env.SEO_INDEXING_CRON_DISABLED !== '1') {
    cron.schedule('0 10 * * *', () => {
      runDailyIndexingBatch('cron-10h').catch((e) => console.error('[seo-indexing-cron] failed:', e.message));
    }, { timezone: 'Europe/Paris' });
    console.log('[seo-agent] indexing cron scheduled: daily 10h Paris (200 URLs/day to Google Indexing API)');
  }



  // Kickstart : au boot, si pas de draft en cours, genere 1 immediate (sauf si SEO_AGENT_NO_KICKSTART=1).
  if (process.env.SEO_AGENT_NO_KICKSTART !== '1') {
    setTimeout(async () => {
      try {
        const pending = await SeoContent.countDocuments({ status: 'draft', createdBy: 'seo-agent' });
        if (pending === 0) {
          console.log('[seo-agent] kickstart: no agent draft pending, generating 1 landing now.');
          await generateOneLanding('kickstart');
        } else {
          console.log(`[seo-agent] kickstart: ${pending} draft(s) already pending, skipping.`);
        }
      } catch (err) {
        console.error('[seo-agent] kickstart failed:', err.message);
      }
    }, 10000);
  }
}

// Permet le lancement manuel via CLI : node server/jobs/seoAgent.js generate-landing
const cliArg = process.argv[2];
if (cliArg) {
  const run = async () => {
    const mongoose = (await import('mongoose')).default;
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    if (cliArg === 'generate-landing') await generateOneLanding('cli');
    else if (cliArg === 'generate-blog') await generateOneBlog('cli');
    else if (cliArg === 'audit') {
      const r = await runWeeklyAudit('cli');
      console.log(JSON.stringify(r, null, 2));
    } else if (cliArg === 'bulk-landings') {
      const n = parseInt(process.argv[3] || '5', 10);
      for (let i = 0; i < n; i++) await generateOneLanding(`cli-bulk-${i + 1}`);
    } else {
      console.log('Usage: node seoAgent.js [generate-landing|generate-blog|audit|bulk-landings N]');
    }
    await mongoose.disconnect();
  };
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

/**
 * Ping Google Indexing API pour 200 URLs/jour (quota par defaut).
 * Strategie : prio aux pages publiees jamais pingees, puis aux plus anciennes (re-cycle).
 * Quota Google reset a minuit Pacific Time = ~9h Paris. On lance a 10h Paris.
 *
 * @author Rabah Ziane - 2026-05-17
 */
export async function runDailyIndexingBatch(reason = 'cron') {
  const QUOTA = parseInt(process.env.GOOGLE_INDEXING_DAILY_QUOTA || '200', 10);
  const log = (msg) => console.log(`[seo-indexing-cron:${reason}] ${msg}`);
  log(`start, quota=${QUOTA}`);

  const items = await SeoContent.find({ status: 'published' })
    .sort({ indexingApiPingedAt: 1, publishedAt: 1 })
    .limit(QUOTA)
    .lean();

  if (items.length === 0) {
    log('no published pages to ping');
    return { count: 0, ok: 0, quota: 0, error: 0 };
  }

  const { notifyGoogle } = await import('../seo/googleIndexing.js');

  let ok = 0, quota = 0, err = 0;
  for (const it of items) {
    const path = it.type === 'article' ? `/blog/${it.slug}` : `/services/${it.slug}`;
    const url = `https://deliverydigital.fr${path}`;
    const r = await notifyGoogle(url);
    const now = new Date();
    let result = 'error';
    if (r.ok) { result = 'ok'; ok++; }
    else if (r.status === 429) { result = '429'; quota++; }
    else { err++; log(`error ${url}: ${r.status || '?'}`); }

    await SeoContent.updateOne({ _id: it._id }, { $set: { indexingApiPingedAt: now, indexingApiPingResult: result } });

    if (quota >= 1) {
      log(`quota 429 hit after ${ok} OK, stop`);
      break;
    }
    await new Promise((res) => setTimeout(res, 200));
  }

  log(`done: ${ok} OK, ${quota} quota-stopped, ${err} errors over ${items.length} candidates`);
  return { count: items.length, ok, quota, error: err };
}
