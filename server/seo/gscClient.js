/**
 * Google Search Console API client.
 *
 * Priorite : OAuth user (token Mongo via /api/admin/google-oauth) si dispo,
 * sinon fallback service account JWT (file GOOGLE_INDEXING_SA_FILE).
 *
 * Le SA fallback est utile en dev/test mais en prod le user-flow est privilegie
 * car le SA n'apparait pas dans GSC Search Console (bug propagation IAM).
 *
 * Cache token 50min, cache resultats 1h.
 *
 * @author Rabah Ziane - 2026-05-17 (v2 OAuth user)
 */
import fs from 'fs';
import crypto from 'crypto';
import GoogleOAuthToken from '../models/GoogleOAuthToken.js';

const TOKEN_TTL_MS = 50 * 60 * 1000;
const RESULT_TTL_MS = 60 * 60 * 1000;
const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

let _saTokenCache = { token: null, exp: 0 };
const _resultCache = new Map();

function loadServiceAccount() {
  const file = process.env.GOOGLE_INDEXING_SA_FILE;
  if (!file) throw new Error('GOOGLE_INDEXING_SA_FILE env not set');
  if (!fs.existsSync(file)) throw new Error(`SA key file not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function getAccessTokenViaSA() {
  const now = Date.now();
  if (_saTokenCache.token && _saTokenCache.exp > now + 60000) return _saTokenCache.token;
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
  if (!j.access_token) throw new Error(`SA token exchange failed: ${JSON.stringify(j)}`);
  _saTokenCache = { token: j.access_token, exp: now + TOKEN_TTL_MS };
  return j.access_token;
}

async function getAccessTokenViaOAuth() {
  const doc = await GoogleOAuthToken.findOne({ service: 'gsc' });
  if (!doc || !doc.refreshToken) return null;
  const now = Date.now();
  if (doc.accessToken && doc.accessTokenExpiresAt && doc.accessTokenExpiresAt.getTime() > now + 60000) {
    return doc.accessToken;
  }
  // refresh
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return null;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: doc.refreshToken, grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!j.access_token) {
    if (j.error === 'invalid_grant') {
      // refresh token revoked - clear so the user can reconnect
      await GoogleOAuthToken.deleteOne({ service: 'gsc' });
    }
    return null;
  }
  doc.accessToken = j.access_token;
  doc.accessTokenExpiresAt = new Date(now + (j.expires_in || 3600) * 1000 - 60000);
  await doc.save();
  return j.access_token;
}

async function getAccessToken() {
  // Priorite OAuth user (toujours present dans GSC) puis fallback SA
  try {
    const t = await getAccessTokenViaOAuth();
    if (t) return { token: t, source: 'oauth' };
  } catch { /* fall through */ }
  try {
    const t = await getAccessTokenViaSA();
    if (t) return { token: t, source: 'sa' };
  } catch { /* nothing */ }
  return null;
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
 * @returns {Promise<{ok:true, rows:[], source:string}|{ok:false, status:'unauthorized'|'no_auth'|'error', message:string}>}
 */
export async function querySearchAnalytics({ days = 30, dimensions = ['page'], rowLimit = 5000 } = {}) {
  const { start, end } = rangeDates(days);
  const key = cacheKey(['sa', start, end, dimensions, rowLimit]);
  const cached = _resultCache.get(key);
  if (cached && cached.exp > Date.now()) return cached.value;

  const auth = await getAccessToken();
  if (!auth) {
    return { ok: false, status: 'no_auth', message: 'No GSC auth: connect via /api/admin/google-oauth/start' };
  }

  const url = `https://www.googleapis.com/webmasters/v3/sites/${siteParam()}/searchAnalytics/query`;
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: start, endDate: end, dimensions, rowLimit }),
    });
  } catch (e) {
    return { ok: false, status: 'error', message: `network: ${e.message || e}` };
  }
  if (resp.status === 403) {
    return { ok: false, status: 'unauthorized', message: `GSC 403 via ${auth.source}: user not owner of property` };
  }
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return { ok: false, status: 'error', message: `gsc ${resp.status}: ${txt.slice(0, 300)}` };
  }
  const j = await resp.json();
  const value = { ok: true, rows: j.rows || [], source: auth.source };
  _resultCache.set(key, { value, exp: Date.now() + RESULT_TTL_MS });
  return value;
}

export function clearCache() { _resultCache.clear(); _saTokenCache = { token: null, exp: 0 }; }
