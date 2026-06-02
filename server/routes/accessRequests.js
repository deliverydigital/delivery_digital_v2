/**
 * Demandes d'acces client.
 *  PUBLIC  /api/access-requests/:token   GET (contexte) + POST (le client soumet
 *          ses identifiants -> chiffres au repos, statut received).
 *  ADMIN   /api/admin/access-requests    GET (liste) + POST /:id/reveal (dechiffre).
 *  (la creation se fait cote agence via /api/agency/self/access-requests)
 * @author Rabah Ziane - 2026-06-02
 */
import express from 'express';
import AccessRequest, { decryptField } from '../models/AccessRequest.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
};
const isExpired = (r) => r.expiresAt && new Date(r.expiresAt).getTime() < Date.now();

export const publicRouter = express.Router();

publicRouter.get('/:token', async (req, res) => {
  const r = await AccessRequest.findOne({ token: req.params.token }).lean();
  if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, status: r.status, expired: isExpired(r), context: { label: r.label, agencyName: r.agencyName } });
});

publicRouter.post('/:token', async (req, res) => {
  const r = await AccessRequest.findOne({ token: req.params.token });
  if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
  if (r.status === 'cancelled') return res.status(410).json({ ok: false, error: 'cancelled' });
  if (isExpired(r)) return res.status(410).json({ ok: false, error: 'expired' });
  const login = (req.body.login || '').trim();
  const password = (req.body.password || '').trim();
  if (!login) return res.status(400).json({ ok: false, error: 'login_required' });
  if (!password) return res.status(400).json({ ok: false, error: 'password_required' });
  const { encryptField } = await import('../models/AccessRequest.js');
  r.status = 'received';
  r.receivedAt = new Date();
  r.encLogin = encryptField(login);
  r.encPassword = encryptField(password);
  r.encNote = req.body.note ? encryptField(String(req.body.note).trim()) : undefined;
  await r.save();
  res.json({ ok: true });
});

export const adminRouter = express.Router();

adminRouter.get('/', requireAdmin, async (req, res) => {
  const rows = await AccessRequest.find({}).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, requests: rows.map((r) => ({ id: r._id, agencyName: r.agencyName, clientEmail: r.clientEmail, label: r.label, status: r.status, createdAt: r.createdAt, receivedAt: r.receivedAt })) });
});

adminRouter.post('/:id/reveal', requireAdmin, async (req, res) => {
  const r = await AccessRequest.findById(req.params.id).lean();
  if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
  if (r.status !== 'received') return res.status(409).json({ ok: false, error: 'not_received' });
  try {
    res.json({ ok: true, clientEmail: r.clientEmail, label: r.label, login: decryptField(r.encLogin), password: decryptField(r.encPassword), note: r.encNote ? decryptField(r.encNote) : undefined });
  } catch (e) { res.status(500).json({ ok: false, error: 'decrypt_failed' }); }
});

export default adminRouter;
