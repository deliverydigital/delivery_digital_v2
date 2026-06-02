/**
 * API d'integration AGENCE (lecture seule, auth par cle API).
 *   Auth : header `Authorization: Bearer <apiKey>` (ou ?api_key=).
 *   GET /api/agency/v1/me       - profil agence
 *   GET /api/agency/v1/catalog  - catalogue formations + prestations
 *   GET /api/agency/v1/devis    - devis lies a l'agence (scopage a venir)
 * @author Rabah Ziane - 2026-06-02
 */
import express from 'express';
import { User, TrainingProgram, QuickQuote } from '../models/index.js';

const router = express.Router();

async function getAgency(req) {
  const auth = req.headers['authorization'] || '';
  let key = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!key) key = req.query.api_key || '';
  if (!key) return null;
  return User.findOne({ apiKey: key, role: 'agence', status: 'active' }).lean();
}
function unauth(res) { return res.status(401).json({ ok: false, error: 'invalid_api_key' }); }

router.get('/me', async (req, res) => {
  const a = await getAgency(req); if (!a) return unauth(res);
  res.json({ ok: true, agency: { id: a._id, name: a.name, email: a.email } });
});

router.get('/catalog', async (req, res) => {
  const a = await getAgency(req); if (!a) return unauth(res);
  const formations = await TrainingProgram.find({}).select('program_id title description category duration_hours price level objectives').lean().catch(() => []);
  res.json({ ok: true, formations });
});

router.get('/devis', async (req, res) => {
  const a = await getAgency(req); if (!a) return unauth(res);
  // Scopage par agence a brancher (champ agencyId sur QuickQuote) - phase suivante.
  const devis = await QuickQuote.find({ agencyId: a._id }).select('ref title status total totalTTC client createdAt').sort({ createdAt: -1 }).lean().catch(() => []);
  res.json({ ok: true, count: devis.length, devis });
});

export default router;
