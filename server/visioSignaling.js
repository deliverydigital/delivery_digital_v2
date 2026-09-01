/**
 * Signalisation WebRTC des salles Delivery Digital (visio des formations).
 *
 * On ne relaie QUE la signalisation (qui est là, offres/réponses SDP, candidats ICE) :
 * l'audio, la vidéo et le partage d'écran circulent en direct entre navigateurs (maillage
 * pair-à-pair), ce qui garde le serveur à quelques kilo-octets par salle. Dimensionné pour
 * les formations : un formateur + quelques apprenants (MAX_PEERS).
 *
 * SALLE D'ATTENTE : le lien du cours est permanent et circule dans le groupe WhatsApp, donc
 * n'importe qui pourrait le relayer. Seul le formateur possède la `hostKey` (lien ?h=...) ;
 * tous les autres patientent en salle d'attente jusqu'à ce qu'il les admette. Sans formateur
 * connecté, personne n'entre.
 *
 * Protocole (JSON sur WebSocket /ws/visio) :
 *   client -> serveur : {t:'join', room, name, hostKey?} | {t:'signal', to, data}
 *                       {t:'state', muted, camOff, sharing} | {t:'chat', text}
 *                       {t:'admit', id} | {t:'deny', id}            (animateur uniquement)
 *   serveur -> client : {t:'welcome', selfId, peers[], isHost, waiting[]} | {t:'waiting'}
 *                       {t:'peer-join'|'peer-leave'|'peer-state'} | {t:'lobby'} | {t:'denied'}
 *                       {t:'signal', from, data} | {t:'chat'} | {t:'error'}
 *
 * @author Rabah Ziane · 2026-07-20
 */
import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import TrainerSession from './models/TrainerSession.js';
import { User } from './models/index.js';

const MAX_PEERS = 12;            // au-delà, le maillage pair-à-pair sature les navigateurs
const MAX_LOBBY = 30;
const MAX_ROOMS = 200;
const PING_MS = 30000;           // détection des connexions mortes (onglet fermé brutalement)

// roomId -> { peers: Map(id -> {ws,name,state,isHost}), lobby: Map(id -> {ws,name}), hostKey, loaded }
const rooms = new Map();

const send = (ws, payload) => { try { if (ws.readyState === 1) ws.send(JSON.stringify(payload)); } catch { /* socket fermée */ } };
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);

function getRoom(roomId) {
  let r = rooms.get(roomId);
  if (!r) { r = { peers: new Map(), lobby: new Map(), hostKey: null, loaded: false }; rooms.set(roomId, r); }
  return r;
}
function dropRoomIfEmpty(roomId) {
  const r = rooms.get(roomId);
  if (r && r.peers.size === 0 && r.lobby.size === 0) rooms.delete(roomId);
}
function broadcast(roomId, payload, exceptId) {
  const r = rooms.get(roomId);
  if (!r) return;
  for (const [id, p] of r.peers) if (id !== exceptId) send(p.ws, payload);
}
function toHosts(roomId, payload) {
  const r = rooms.get(roomId);
  if (!r) return;
  for (const [, p] of r.peers) if (p.isHost) send(p.ws, payload);
}
const hostCount = (r) => [...r.peers.values()].filter((p) => p.isHost).length;

/** Fait entrer un pair de la salle d'attente vers la salle. */
function admit(roomId, peerId) {
  const r = rooms.get(roomId);
  if (!r) return;
  const w = r.lobby.get(peerId);
  if (!w) return;
  if (r.peers.size >= MAX_PEERS) return send(w.ws, { t: 'error', code: 'room_full' });
  r.lobby.delete(peerId);
  const state = { muted: false, camOff: false, sharing: false };
  // Le nouvel entrant appelle ceux qui sont déjà là (une seule extrémité émet l'offre).
  send(w.ws, { t: 'welcome', selfId: peerId, isHost: false, peers: [...r.peers].map(([id, p]) => ({ id, name: p.name, state: p.state })), waiting: [] });
  r.peers.set(peerId, { ws: w.ws, name: w.name, state, isHost: false });
  w.ws.dd.admitted = true;
  broadcast(roomId, { t: 'peer-join', id: peerId, name: w.name, state }, peerId);
  toHosts(roomId, { t: 'lobby', action: 'leave', id: peerId });
}

function leave(ws) {
  const { roomId, peerId } = ws.dd || {};
  if (!roomId || !peerId) return;
  const r = rooms.get(roomId);
  if (!r) return;
  if (r.peers.delete(peerId)) broadcast(roomId, { t: 'peer-leave', id: peerId });
  if (r.lobby.delete(peerId)) toHosts(roomId, { t: 'lobby', action: 'leave', id: peerId });
  // Plus d'animateur : ceux qui patientent doivent le savoir plutôt que d'attendre dans le vide.
  if (hostCount(r) === 0) for (const [, w] of r.lobby) send(w.ws, { t: 'waiting', hostPresent: false });
  dropRoomIfEmpty(roomId);
  ws.dd = {};
}

export function attachVisioSignaling(server) {
  const wss = new WebSocketServer({ server, path: '/ws/visio', maxPayload: 256 * 1024 });

  wss.on('connection', (ws) => {
    ws.dd = {};
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      /* ---------------------------- Entrée ---------------------------- */
      if (msg.t === 'join') {
        if (ws.dd.roomId) return; // déjà engagé dans une salle
        const roomId = clean(msg.room, 64);
        if (!/^[a-zA-Z0-9_-]{8,64}$/.test(roomId)) return send(ws, { t: 'error', code: 'bad_room' });
        if (!rooms.has(roomId) && rooms.size >= MAX_ROOMS) return send(ws, { t: 'error', code: 'server_busy' });

        const r = getRoom(roomId);
        // La clé d'animateur du cours n'est lue qu'une fois par salle vivante.
        if (!r.loaded) {
          r.loaded = true;
          try {
            // Salle permanente d'un formateur (slug à son nom) d'abord, sinon salle d'un cours.
            const t = await User.findOne({ visioRoomSlug: roomId, role: 'trainer' }).select('visioHostKey').lean();
            if (t?.visioHostKey) r.hostKey = t.visioHostKey;
            else {
              const s = await TrainerSession.findOne({ roomId }).select('hostKey').lean();
              r.hostKey = s?.hostKey || null;
            }
          } catch { r.hostKey = null; }
        }

        const peerId = crypto.randomBytes(8).toString('hex');
        const name = clean(msg.name, 60) || 'Participant';
        const key = clean(msg.hostKey, 80);
        // Animateur : bonne clé, ou salle hors cours (lien improvisé) dont personne n'a la main.
        const isHost = r.hostKey ? (!!key && crypto.timingSafeEqual(Buffer.from(key.padEnd(80, '\0')), Buffer.from(r.hostKey.padEnd(80, '\0')))) : r.peers.size === 0;
        ws.dd = { roomId, peerId };

        if (isHost) {
          if (r.peers.size >= MAX_PEERS) return send(ws, { t: 'error', code: 'room_full' });
          const state = { muted: false, camOff: false, sharing: false };
          send(ws, {
            t: 'welcome', selfId: peerId, isHost: true,
            peers: [...r.peers].map(([id, p]) => ({ id, name: p.name, state: p.state })),
            waiting: [...r.lobby].map(([id, w]) => ({ id, name: w.name })),
          });
          r.peers.set(peerId, { ws, name, state, isHost: true });
          ws.dd.admitted = true;
          broadcast(roomId, { t: 'peer-join', id: peerId, name, state }, peerId);
          return;
        }

        if (r.lobby.size >= MAX_LOBBY) return send(ws, { t: 'error', code: 'lobby_full' });
        r.lobby.set(peerId, { ws, name });
        send(ws, { t: 'waiting', hostPresent: hostCount(r) > 0 });
        toHosts(roomId, { t: 'lobby', action: 'join', id: peerId, name });
        return;
      }

      const { roomId, peerId } = ws.dd;
      if (!roomId || !peerId) return;
      const r = rooms.get(roomId);
      if (!r) return;
      const me = r.peers.get(peerId);

      /* ------------------- Décisions de l'animateur ------------------- */
      if (msg.t === 'admit' || msg.t === 'deny') {
        if (!me || !me.isHost) return;
        const targetId = clean(msg.id, 32);
        if (msg.t === 'admit') return void admit(roomId, targetId);
        const w = r.lobby.get(targetId);
        if (w) { r.lobby.delete(targetId); send(w.ws, { t: 'denied' }); toHosts(roomId, { t: 'lobby', action: 'leave', id: targetId }); }
        return;
      }

      // Tout le reste exige d'être réellement entré : personne ne signale depuis l'attente.
      if (!me) return;

      if (msg.t === 'signal') {
        const target = r.peers.get(clean(msg.to, 32));
        if (target) send(target.ws, { t: 'signal', from: peerId, data: msg.data });
      } else if (msg.t === 'state') {
        me.state = { muted: !!msg.muted, camOff: !!msg.camOff, sharing: !!msg.sharing };
        broadcast(roomId, { t: 'peer-state', id: peerId, state: me.state }, peerId);
      } else if (msg.t === 'chat') {
        const text = clean(msg.text, 2000);
        if (!text) return;
        broadcast(roomId, { t: 'chat', id: peerId, name: me.name, text, at: Date.now() }, peerId);
      }
    });

    ws.on('close', () => leave(ws));
    ws.on('error', () => leave(ws));
  });

  // Un onglet fermé sans handshake laisse un pair fantôme dans la grille : on purge au ping.
  const timer = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) { leave(ws); ws.terminate(); continue; }
      ws.isAlive = false;
      try { ws.ping(); } catch { /* ignore */ }
    }
  }, PING_MS);
  wss.on('close', () => clearInterval(timer));

  console.log('🎥 Signalisation visio prête sur /ws/visio (salle d\'attente activée)');
  return wss;
}
