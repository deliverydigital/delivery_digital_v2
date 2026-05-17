/**
 * Scraper Google SERP via Playwright (headless Chromium).
 *
 * Strategie:
 *  - Lance un browser headless 1 fois, reuse contexte
 *  - Headers + viewport realistes pour eviter detection bot
 *  - Accepte les cookies si dialog apparait
 *  - Parse les organic results (skip ads / featured snippets)
 *  - Rate limit doux : 1 query / 3-7 sec (random)
 *  - Quota recommande : max ~50/jour pour eviter ban IP
 *
 * @author Rabah Ziane - 2026-05-17
 */
import { chromium } from 'playwright-core';

let _browser = null;
let _lastQueryAt = 0;
const MIN_INTERVAL_MS = 3000;
const MAX_INTERVAL_MS = 7000;

const GOOGLE_HOSTS = {
  fr: 'www.google.fr', sa: 'www.google.com.sa', qa: 'www.google.com.qa',
  ae: 'www.google.ae', kw: 'www.google.com.kw', om: 'www.google.com.om',
  bh: 'www.google.com.bh', mc: 'www.google.fr', uk: 'www.google.co.uk', us: 'www.google.com',
};
const LANGS = { fr: 'fr', sa: 'ar', qa: 'en', ae: 'en', kw: 'ar', om: 'en', bh: 'en', mc: 'fr', uk: 'en', us: 'en' };

async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });
  return _browser;
}

async function sleepRandom() {
  const wait = Math.floor(MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS));
  await new Promise((res) => setTimeout(res, wait));
}

async function rateLimit() {
  const now = Date.now();
  const dt = now - _lastQueryAt;
  if (dt < MIN_INTERVAL_MS) {
    await new Promise((res) => setTimeout(res, MIN_INTERVAL_MS - dt));
  }
  _lastQueryAt = Date.now();
}

/**
 * Scrape Google SERP for a keyword.
 * @returns {Promise<{ok:true, results:[], totalResults:number}|{ok:false, status, message}>}
 */
export async function scrapeGoogleSerp(keyword, market = 'fr', n = 10) {
  await rateLimit();
  const host = GOOGLE_HOSTS[market] || GOOGLE_HOSTS.fr;
  const hl = LANGS[market] || 'fr';
  const url = `https://${host}/search?q=${encodeURIComponent(keyword)}&hl=${hl}&gl=${market}&num=${Math.max(10, n)}&pws=0`;

  let browser, ctx, page;
  try {
    browser = await getBrowser();
    ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      locale: `${hl}-${market.toUpperCase()}`,
      extraHTTPHeaders: { 'Accept-Language': `${hl},en;q=0.9` },
    });
    page = await ctx.newPage();
    // Stealth-ish: hide webdriver flag
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Accept cookies if banner shows
    try {
      const acceptBtn = await page.$('button:has-text("Tout accepter"), button:has-text("Accept all"), button:has-text("J\'accepte")');
      if (acceptBtn) {
        await acceptBtn.click();
        await page.waitForLoadState('domcontentloaded');
      }
    } catch { /* ignore */ }

    // Wait for results to render
    await page.waitForSelector('div#search, div#main, body', { timeout: 10000 }).catch(() => {});
    await sleepRandom();

    // Detect captcha / blocked
    const html = await page.content();
    if (html.includes('detected unusual traffic') || html.includes('captcha') || html.includes('Pour continuer, veuillez confirmer')) {
      return { ok: false, status: 'captcha', message: 'Google demande un captcha — IP probablement signalée' };
    }

    // Extract organic results
    const results = await page.evaluate(() => {
      const out = [];
      // Modern Google: results are in div with jsname or specific structure
      // Try multiple selectors
      const selectors = [
        'div.g',                  // classic
        'div[data-snc]',          // newer
        'div[jsname="N54PNb"]',   // 2024
      ];
      let elems = [];
      for (const sel of selectors) {
        elems = Array.from(document.querySelectorAll(sel));
        if (elems.length >= 3) break;
      }
      // Fallback: a:h3 pattern
      if (elems.length < 3) {
        const links = Array.from(document.querySelectorAll('a > h3'));
        elems = links.map((h3) => h3.closest('div'));
      }

      const seen = new Set();
      for (const el of elems) {
        if (!el) continue;
        const a = el.querySelector('a[href^="http"]');
        const h3 = el.querySelector('h3');
        if (!a || !h3) continue;
        const url = a.href;
        if (seen.has(url)) continue;
        seen.add(url);
        // Skip Google's own pages
        if (url.includes('google.com/search') || url.includes('google.com/url') || url.includes('webcache.googleusercontent')) continue;
        const title = h3.textContent || '';
        const snippet = (el.querySelector('div[data-content-feature], span.aCOpRe, div.VwiC3b')?.textContent || '').slice(0, 200);
        out.push({ url, title, snippet });
        if (out.length >= 20) break;
      }
      return out;
    });

    const organic = results.slice(0, n).map((r, i) => ({
      position: i + 1,
      title: r.title,
      url: r.url,
      domain: (() => { try { return new URL(r.url).hostname.replace(/^www\./, ''); } catch { return ''; } })(),
      snippet: r.snippet || '',
    }));

    return { ok: true, results: organic, totalResults: results.length };
  } catch (e) {
    return { ok: false, status: 'error', message: String(e.message || e).slice(0, 300) };
  } finally {
    try { await page?.close(); } catch { /* */ }
    try { await ctx?.close(); } catch { /* */ }
  }
}

export async function closeScraperBrowser() {
  if (_browser) { try { await _browser.close(); } catch { /* */ } _browser = null; }
}
