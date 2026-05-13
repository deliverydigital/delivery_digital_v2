/**
 * Google Indexing API minimaliste (zero dependance, juste crypto + fetch).
 *
 * Lit la cle du service account JSON depuis :
 *   - process.env.GOOGLE_INDEXING_SA_KEY  (JSON complet en string)
 *   OU
 *   - fs read sur process.env.GOOGLE_INDEXING_SA_FILE (chemin vers .json)
 *
 * Pre-requis cote user (a faire 1× dans Google Cloud Console) :
 *  1. Creer un projet GCP
 *  2. Activer l'API "Indexing API"
 *  3. Creer un compte de service, telecharger la cle JSON
 *  4. Aller dans Google Search Console, proprietes du site, Utilisateurs et autorisations
 *  5. Ajouter l'email du service account comme "proprietaire"
 *  6. Mettre le JSON entier dans .env -> GOOGLE_INDEXING_SA_KEY='{...}'
 *
 * Quota : 200 URLs / jour / projet (gratuit).
 *
 * @author Rabah Ziane - 2026-05-13
 */

import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

let cachedSa = null;
let cachedTokenInfo = null;

function loadServiceAccount() {
  if (cachedSa) return cachedSa;
  const raw = process.env.GOOGLE_INDEXING_SA_KEY
    || (process.env.GOOGLE_INDEXING_SA_FILE ? readFileSync(process.env.GOOGLE_INDEXING_SA_FILE, 'utf8') : null);
  if (!raw) return null;
  try {
    cachedSa = JSON.parse(raw);
    return cachedSa;
  } catch (e) {
    console.error('[google-indexing] failed to parse service account JSON:', e.message);
    return null;
  }
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signJwt(sa) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const headerB64 = base64url(JSON.stringify(header));
  const claimB64 = base64url(JSON.stringify(claim));
  const signingInput = `${headerB64}.${claimB64}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const sig = signer.sign(sa.private_key);
  return `${signingInput}.${base64url(sig)}`;
}

async function getAccessToken() {
  if (cachedTokenInfo && cachedTokenInfo.expiresAt > Date.now() + 60_000) {
    return cachedTokenInfo.token;
  }
  const sa = loadServiceAccount();
  if (!sa) return null;
  const jwt = signJwt(sa);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[google-indexing] token exchange failed:', res.status, text);
    return null;
  }
  const data = await res.json();
  cachedTokenInfo = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedTokenInfo.token;
}

export async function notifyGoogle(url, type = 'URL_UPDATED') {
  try {
    const token = await getAccessToken();
    if (!token) return { ok: false, skipped: true, reason: 'no service account configured' };
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url, type }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[google-indexing] publish failed:', res.status, text);
      return { ok: false, status: res.status, error: text };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    console.error('[google-indexing] error:', e.message);
    return { ok: false, error: e.message };
  }
}

export async function notifyGoogleBatch(urls, type = 'URL_UPDATED') {
  const results = [];
  for (const url of urls) {
    results.push({ url, ...(await notifyGoogle(url, type)) });
    await new Promise((r) => setTimeout(r, 120)); // doux : 8 req/s, bien sous le quota
  }
  return results;
}

export function isIndexingConfigured() {
  return Boolean(process.env.GOOGLE_INDEXING_SA_KEY || process.env.GOOGLE_INDEXING_SA_FILE);
}
