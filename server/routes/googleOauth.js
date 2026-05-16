/**
 * Flow OAuth 2.0 user pour acceder a Google Search Console API
 * (et autres APIs Google) sans depender d'un service account.
 *
 * Routes :
 *   GET  /api/admin/google-oauth/status?secret=...    -> { connected, email, scopes }
 *   GET  /api/admin/google-oauth/start?secret=...     -> 302 vers Google consent
 *   GET  /api/admin/google-oauth/callback?code=&state -> exchange code + save token + 302 /admin?googleConnected=1
 *   POST /api/admin/google-oauth/disconnect           -> clear stored token (header x-admin-secret)
 *
 * Secret bridge : on signe le admin secret dans le state param HMAC pour eviter
 * de l'exposer dans l'URL en clair tout en pouvant le verifier au callback.
 *
 * @author Rabah Ziane - 2026-05-17
 */
import express from 'express';
import crypto from 'crypto';
import GoogleOAuthToken from '../models/GoogleOAuthToken.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://deliverydigital.fr/api/admin/google-oauth/callback';
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly', 'openid', 'email'];
const ADMIN_URL = process.env.ADMIN_URL || 'https://deliverydigital.fr/admin';

const router = express.Router();

function requireAdminHeader(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function requireAdminQuery(req, res, next) {
  const secret = req.query.secret;
  if (secret !== ADMIN_SECRET) return res.status(401).send('unauthorized');
  next();
}

function signState() {
  // state = randomBytes16.hex
  return crypto.randomBytes(16).toString('hex');
}

const _stateStore = new Map(); // state -> { exp, ts }
const STATE_TTL_MS = 10 * 60 * 1000;
function rememberState(state) {
  _stateStore.set(state, Date.now() + STATE_TTL_MS);
  // Garbage collect expired states
  for (const [k, exp] of _stateStore) if (exp < Date.now()) _stateStore.delete(k);
}
function consumeState(state) {
  const exp = _stateStore.get(state);
  _stateStore.delete(state);
  return exp && exp > Date.now();
}

/* ---------- STATUS ---------- */
router.get('/status', requireAdminQuery, async (_req, res) => {
  try {
    const doc = await GoogleOAuthToken.findOne({ service: 'gsc' }).lean();
    if (!doc) return res.json({ connected: false });
    res.json({
      connected: true,
      email: doc.googleUserEmail || '',
      scopes: doc.scopes || [],
      since: doc.createdAt,
    });
  } catch (e) {
    res.status(500).json({ error: 'status_failed', message: String(e.message || e) });
  }
});

/* ---------- START ---------- */
router.get('/start', requireAdminQuery, (_req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).send('GOOGLE_OAUTH_CLIENT_ID/SECRET not configured on server');
  }
  const state = signState();
  rememberState(state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

/* ---------- CALLBACK ---------- */
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`${ADMIN_URL}?googleError=${encodeURIComponent(String(error))}`);
  if (!code || !state || !consumeState(String(state))) {
    return res.redirect(`${ADMIN_URL}?googleError=invalid_state`);
  }
  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tok = await tokenResp.json();
    if (!tok.access_token || !tok.refresh_token) {
      return res.redirect(`${ADMIN_URL}?googleError=${encodeURIComponent(tok.error || 'no_token')}`);
    }
    // Fetch user email
    let email = '';
    try {
      const ui = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      const u = await ui.json();
      email = u.email || '';
    } catch { /* non-blocking */ }

    await GoogleOAuthToken.updateOne(
      { service: 'gsc' },
      {
        $set: {
          refreshToken: tok.refresh_token,
          accessToken: tok.access_token,
          accessTokenExpiresAt: new Date(Date.now() + (tok.expires_in || 3600) * 1000 - 60000),
          scopes: (tok.scope || SCOPES.join(' ')).split(' '),
          googleUserEmail: email,
        },
      },
      { upsert: true }
    );
    res.redirect(`${ADMIN_URL}?googleConnected=1`);
  } catch (e) {
    res.redirect(`${ADMIN_URL}?googleError=${encodeURIComponent(String(e.message || e))}`);
  }
});

/* ---------- DISCONNECT ---------- */
router.post('/disconnect', requireAdminHeader, async (_req, res) => {
  try {
    await GoogleOAuthToken.deleteOne({ service: 'gsc' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'disconnect_failed', message: String(e.message || e) });
  }
});

export default router;
