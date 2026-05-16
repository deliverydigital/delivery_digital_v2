/**
 * Google Search Console API client.
 *
 * Reuse le service account existant (GOOGLE_INDEXING_SA_FILE) avec le scope
 * webmasters.readonly. Cache token 50 min, cache resultats 1h.
 *
 * @author Rabah Ziane - 2026-05-17
 */
import fs from 'fs';
import crypto from 'crypto';

const TOKEN_TTL_MS = 50 * 60 * 1000;
const RESULT_TTL_MS = 60 * 60 * 1000;
const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

let _tokenCache = { token: null, exp: 0 };
const _resultCache = new Map();

function loadServiceAccount() {
  const file = process.env.GOOGLE_INDEXING_SA_FILE;
  if (!file) throw new Error('GOOGLE_INDEXING_SA_FILE env not set');
  if (!fs.existsSync(file)) throw new Error(`SA key file not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function getAccessToken() {
  const now = Date.now();
  if (_tokenCache.token && _tokenCache.exp > now + 60000) return _tokenCache.token;
  const sa = loadServiceAccount();
  const iat = Math.floor(now / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: GSC_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: iat + 3600, iat,
  })).toString('base64url');
  const toSign = `${header}.${claim}`;
  const sig = crypto.createSign('RSA-SHA256').update(toSign).end().sign(sa.private_key).toString('base64url');
  const jwt = `${toSign}.${sig}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`token exchange failed: ${JSON.stringify(j)}`);
  _tokenCache = { token: j.access_token, exp: now + TOKEN_TTL_MS };
  return j.access_token;
}

function siteParam() {
  return encodeURIComponent(process.env.GSC_SITE_URL || 'sc-domain:deliverydigital.fr');
}

function fmtDate(d) { return d.toISOString().slice(0, 10); }

function rangeDates(days) {
  const end = new Date(); end.setDate(end.getDate() - 1);
  const start = new Date(); start.setDate(start.getDate() - days);
  return { start: fmtDate(start), end: fmtDate(end) };
}

function cacheKey(parts) { return JSON.stringify(parts); }

/**
 * Query GSC searchAnalytics.
 * @returns {Promise<{ok:true, rows:[]}|{ok:false, status:'unauthorized'|'error', message:string}>}
 */
export async function querySearchAnalytics({ days = 30, dimensions = ['page'], rowLimit = 5000 } = {}) {
  const { start, end } = rangeDates(days);
  const key = cacheKey(['sa', start, end, dimensions, rowLimit]);
  const cached = _resultCache.get(key);
  if (cached && cached.exp > Date.now()) return cached.value;

  let token;
  try { token = await getAccessToken(); }
  catch (e) { return { ok: false, status: 'error', message: String(e.message || e) }; }

  const url = `https://www.googleapis.com/webmasters/v3/sites/${siteParam()}/searchAnalytics/query`;
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: start, endDate: end, dimensions, rowLimit }),
    });
  } catch (e) {
    return { ok: false, status: 'error', message: `network: ${e.message || e}` };
  }
  if (resp.status === 403) {
    return { ok: false, status: 'unauthorized', message: 'GSC: service account not added as property owner. See README.' };
  }
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return { ok: false, status: 'error', message: `gsc ${resp.status}: ${txt.slice(0, 300)}` };
  }
  const j = await resp.json();
  const value = { ok: true, rows: j.rows || [] };
  _resultCache.set(key, { value, exp: Date.now() + RESULT_TTL_MS });
  return value;
}

export function clearCache() { _resultCache.clear(); _tokenCache = { token: null, exp: 0 }; }
