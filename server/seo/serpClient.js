/**
 * Client SERP : query Google et retourne top N resultats.
 *
 * Priorite providers :
 *   1. Serper.dev (SERPER_API_KEY) - reel Google, $50/mois 2500 credits free
 *   2. Google Custom Search (GOOGLE_CSE_API_KEY + GOOGLE_CSE_ID) - 100/jour free
 *   3. ScraperAPI / SerpApi (futur)
 *
 * @author Rabah Ziane - 2026-05-17
 */

const MARKETS = {
  fr: { gl: 'fr', hl: 'fr', google: 'google.fr', location: 'France' },
  sa: { gl: 'sa', hl: 'ar', google: 'google.com.sa', location: 'Saudi Arabia' },
  qa: { gl: 'qa', hl: 'en', google: 'google.com.qa', location: 'Qatar' },
  ae: { gl: 'ae', hl: 'en', google: 'google.ae', location: 'United Arab Emirates' },
  kw: { gl: 'kw', hl: 'ar', google: 'google.com.kw', location: 'Kuwait' },
  om: { gl: 'om', hl: 'en', google: 'google.com.om', location: 'Oman' },
  bh: { gl: 'bh', hl: 'en', google: 'google.com.bh', location: 'Bahrain' },
  uk: { gl: 'uk', hl: 'en', google: 'google.co.uk', location: 'United Kingdom' },
  us: { gl: 'us', hl: 'en', google: 'google.com', location: 'United States' },
  mc: { gl: 'fr', hl: 'fr', google: 'google.fr', location: 'Monaco' },
};

import { scrapeGoogleSerp } from "./googleScraper.js";

export function isSerpConfigured() {
  return true; // playwright fallback toujours dispo
}

export function getSerpProvider() {
  if (process.env.SERPER_API_KEY) return 'serper';
  if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) return 'google-cse';
  return 'playwright';
}

async function fetchSerper(keyword, market = 'fr', n = 10) {
  const m = MARKETS[market] || MARKETS.fr;
  const r = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: keyword,
      gl: m.gl,
      hl: m.hl,
      num: Math.max(10, n),
      location: m.location,
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    return { ok: false, status: r.status, message: `serper: ${txt.slice(0, 200)}` };
  }
  const j = await r.json();
  const organic = (j.organic || []).slice(0, n).map((it, i) => ({
    position: i + 1,
    title: it.title || '',
    url: it.link || '',
    domain: (() => { try { return new URL(it.link).hostname.replace(/^www\./, ''); } catch { return ''; } })(),
    snippet: it.snippet || '',
  }));
  return { ok: true, results: organic, totalResults: j.searchInformation?.totalResults || j.organic?.length || 0 };
}

async function fetchGoogleCSE(keyword, market = 'fr', n = 10) {
  const m = MARKETS[market] || MARKETS.fr;
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', process.env.GOOGLE_CSE_API_KEY);
  url.searchParams.set('cx', process.env.GOOGLE_CSE_ID);
  url.searchParams.set('q', keyword);
  url.searchParams.set('num', String(Math.min(10, n)));
  url.searchParams.set('gl', m.gl);
  url.searchParams.set('hl', m.hl);
  const r = await fetch(url);
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    return { ok: false, status: r.status, message: `cse: ${txt.slice(0, 200)}` };
  }
  const j = await r.json();
  const items = (j.items || []).slice(0, n).map((it, i) => ({
    position: i + 1,
    title: it.title || '',
    url: it.link || '',
    domain: (() => { try { return new URL(it.link).hostname.replace(/^www\./, ''); } catch { return ''; } })(),
    snippet: it.snippet || '',
  }));
  return { ok: true, results: items, totalResults: j.searchInformation?.totalResults || items.length };
}

/**
 * Lance une recherche SERP pour un mot-cle.
 * @param {string} keyword
 * @param {string} market (fr, sa, qa, ae, kw, om, bh, mc, uk, us)
 * @returns {Promise<{ok:true, results:[], totalResults:number, provider:string}|{ok:false,...}>}
 */
export async function querySerp(keyword, market = 'fr', n = 10) {
  const provider = getSerpProvider();
  if (!provider) return { ok: false, status: 'no_provider', message: 'No SERP provider configured. Set SERPER_API_KEY or GOOGLE_CSE_API_KEY+GOOGLE_CSE_ID in .env' };
  if (provider === 'serper') {
    const r = await fetchSerper(keyword, market, n);
    return r.ok ? { ...r, provider: 'serper' } : r;
  }
  if (provider === 'google-cse') {
    const r = await fetchGoogleCSE(keyword, market, n);
    return r.ok ? { ...r, provider: 'google-cse' } : r;
  }
  if (provider === 'playwright') {
    const r = await scrapeGoogleSerp(keyword, market, n);
    return r.ok ? { ...r, provider: 'playwright' } : r;
  }
  return { ok: false, status: 'unknown_provider', message: provider };
}
