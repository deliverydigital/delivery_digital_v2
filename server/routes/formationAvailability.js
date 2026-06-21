/**
 * Disponibilite publique des sessions de formation : jours indisponibles (poses par le
 * superadmin) que le wizard exclut + formateurs actifs et leurs creneaux recurrents +
 * creneaux deja reserves (dossiers non rejetes + conventions en attente). @author Rabah Ziane - 2026-06-04
 * MAJ 2026-06-19 : ajout formateurs (nom + dispos) et reservations pour le wizard.
 */
import express from 'express';
import FormationUnavailability from '../models/FormationUnavailability.js';
import { User } from '../models/index.js';
import AgencyDossier from '../models/AgencyDossier.js';
import ConventionSignRequest from '../models/ConventionSignRequest.js';
import { parisHour } from '../lib/trainerAssign.js';

export const publicRouter = express.Router();

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Clé créneau en heure Europe/Paris (serveur en UTC) pour matcher les libellés formateur 16:00/17:00.
const slotKeyFromStart = (start) => `${String(parisHour(start)).padStart(2, '0')}:00`;

// Compte une reservation : occupe le (jour, creneau) sur les 3 jours consecutifs.
function addBooking(map, start) {
  if (!start) return;
  const s = new Date(start);
  const slot = slotKeyFromStart(s);
  for (let k = 0; k < 3; k++) {
    const d = new Date(s); d.setDate(d.getDate() + k);
    const key = dayKey(d);
    if (!map[key]) map[key] = {};
    map[key][slot] = (map[key][slot] || 0) + 1;
  }
}

publicRouter.get('/', async (req, res) => {
  try {
    const rows = await FormationUnavailability.find({}).select('day').lean();
    const days = rows.map((r) => r.day);

    // Formateurs actifs + leurs creneaux recurrents (jours JS 0-6 + slots d'1h).
    const trainers = await User.find({ role: 'trainer', status: 'active' })
      .select('name email recurringAvailability').lean();
    const trainerList = trainers.map((t) => ({
      id: String(t._id), name: t.name || 'Formateur', email: t.email || '',
      days: (t.recurringAvailability?.days || []).map(Number),
      slots: (t.recurringAvailability?.slots || []).map((s) => ({ from: s.from, to: s.to })),
    }));

    // Reservations -> creneaux occupes. Dossiers non rejetes/non masques + conventions en attente non expirees.
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const booked = {};
    try {
      const doss = await AgencyDossier.find({ status: { $ne: 'rejected' }, hidden: { $ne: true }, sessionStart: { $gte: today } }).select('sessionStart').lean();
      doss.forEach((d) => addBooking(booked, d.sessionStart));
      const reqs = await ConventionSignRequest.find({ status: 'pending', expiresAt: { $gt: new Date() }, sessionStart: { $gte: today } }).select('sessionStart').lean();
      reqs.forEach((r) => addBooking(booked, r.sessionStart));
    } catch (e) { /* best effort */ }

    res.json({ ok: true, days, trainers: trainerList, booked });
  } catch (e) { res.json({ ok: true, days: [], trainers: [], booked: {} }); }
});

export default publicRouter;
