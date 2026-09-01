/**
 * API publique des salles de visioconférence Delivery Digital.
 *   GET /api/visio/room/:roomId - libellés à afficher dans la salle (formation, client, formateur)
 *   GET /api/visio/ice          - serveurs STUN/TURN à utiliser par le navigateur
 * La salle elle-même est en pair-à-pair (voir server/visioSignaling.js) : ces routes ne
 * transportent aucun flux, seulement de quoi habiller la page et traverser les NAT.
 * @author Rabah Ziane · 2026-07-20
 */
import express from 'express';
import crypto from 'crypto';
import TrainerSession from '../models/TrainerSession.js';
import { User } from '../models/index.js';

const router = express.Router();
const HOST = process.env.VISIO_TURN_HOST || '';       // ex. 'deliverydigital.fr'
const TURN_SECRET = process.env.VISIO_TURN_SECRET || '';

/**
 * Identifiants TURN éphémères (mécanisme REST de coturn : user = "expiration:nom",
 * mot de passe = HMAC-SHA1 du user avec le secret partagé). Rien de permanent ne fuite
 * dans le navigateur, les accès expirent au bout de quelques heures.
 */
function turnCredentials(ttlSeconds = 6 * 3600) {
  if (!HOST || !TURN_SECRET) return null;
  const username = `${Math.floor(Date.now() / 1000) + ttlSeconds}:dd`;
  const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64');
  return { username, credential };
}

router.get('/ice', (req, res) => {
  const iceServers = [];
  if (HOST) iceServers.push({ urls: [`stun:${HOST}:3478`] });
  const cred = turnCredentials();
  if (cred && HOST) {
    // UDP d'abord (meilleure latence), TCP/443 en secours derrière les pare-feux d'entreprise.
    iceServers.push({ urls: [`turn:${HOST}:3478?transport=udp`, `turn:${HOST}:3478?transport=tcp`], ...cred });
  }
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, iceServers });
});

router.get('/room/:roomId', async (req, res) => {
  const roomId = String(req.params.roomId || '');
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(roomId)) return res.status(400).json({ ok: false, error: 'bad_room' });

  // Deux formes de salle : la salle PERMANENTE d'un formateur (slug à son nom) ou la salle
  // d'un cours précis. La salle permanente prime : c'est le lien qu'il diffuse partout.
  const trainer = await User.findOne({ visioRoomSlug: roomId, role: 'trainer' }).select('name').lean().catch(() => null);
  if (trainer) {
    // Le cours du jour habille la salle (titre, client) sans changer le lien.
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const s = await TrainerSession.findOne({ trainerId: trainer._id, status: 'scheduled', 'days.date': today })
      .select('formationTitle clientName days').lean().catch(() => null);
    return res.json({
      ok: true,
      room: {
        roomId,
        title: s?.formationTitle || `Salle de ${trainer.name}`,
        client: s?.clientName || '',
        host: trainer.name,
        permanent: true,
        days: s?.days || [],
      },
    });
  }

  const s = await TrainerSession.findOne({ roomId }).select('formationTitle clientName trainerName days sessionStart status').lean().catch(() => null);
  // Salle inconnue = salle libre : le lien reste utilisable (comportement attendu d'un lien de réunion).
  if (!s) return res.json({ ok: true, room: { roomId, title: 'Réunion Delivery Digital' } });
  res.json({
    ok: true,
    room: {
      roomId,
      title: s.formationTitle || 'Réunion Delivery Digital',
      client: s.clientName || '',
      host: s.trainerName || '',
      cancelled: s.status === 'cancelled',
      days: s.days || [],
    },
  });
});

export default router;
