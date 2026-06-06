/**
 * Disponibilite publique des sessions de formation : liste des jours indisponibles
 * (poses par le superadmin) que le wizard exclut. @author Rabah Ziane - 2026-06-04
 */
import express from 'express';
import FormationUnavailability from '../models/FormationUnavailability.js';

export const publicRouter = express.Router();

publicRouter.get('/', async (req, res) => {
  try {
    const rows = await FormationUnavailability.find({}).select('day').lean();
    res.json({ ok: true, days: rows.map((r) => r.day) });
  } catch (e) { res.json({ ok: true, days: [] }); }
});

export default publicRouter;
