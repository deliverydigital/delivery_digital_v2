/**
 * Salle de visioconférence Delivery Digital (page publique /visio/:roomId).
 *
 * Fonctionne comme un Meet : on ouvre le lien, on saisit son prénom, on vérifie sa caméra
 * et son micro, on rejoint. Audio/vidéo/partage d'écran circulent en direct entre les
 * navigateurs (WebRTC en maillage) ; notre serveur ne relaie que la signalisation
 * (server/visioSignaling.js). Aucun compte, aucune installation.
 *
 * Choix notables :
 * - un seul flux local partagé par toutes les connexions, et `replaceTrack` pour basculer
 *   caméra <-> écran sans renégocier avec chaque participant ;
 * - c'est l'arrivant qui appelle les pairs déjà présents (évite le "glare" où les deux
 *   extrémités s'envoient une offre en même temps) ;
 * - file d'attente des candidats ICE reçus avant la description distante, sinon Safari
 *   rejette les premiers candidats et la connexion reste bloquée en "checking".
 *
 * @author Rabah Ziane · 2026-07-20
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Users, MessageSquare,
  Send, Copy, Loader2, AlertCircle, X, UserPlus, Clock,
} from 'lucide-react';

const BLUE = '#0066CC';
const LOGO_URL = '/Logo-DELIVERY-Digital-Neo-sans-Bold%20noir_%202%20copie%205.png';

type PeerState = { muted: boolean; camOff: boolean; sharing: boolean };
type Peer = { id: string; name: string; state: PeerState; stream?: MediaStream };
type ChatMsg = { id: string; name: string; text: string; at: number; self?: boolean };

export default function VisioRoom({ roomId }: { roomId: string }) {
  // Clé d'animateur : présente uniquement dans le lien privé du formateur (?h=...).
  const hostKey = useMemo(() => new URLSearchParams(location.search).get('h') || '', []);
  const [room, setRoom] = useState<{ title: string; client?: string; host?: string } | null>(null);
  const [name, setName] = useState(() => localStorage.getItem('dd_visio_name') || '');
  const [joined, setJoined] = useState(false);
  const [fatal, setFatal] = useState('');

  useEffect(() => {
    fetch(`/api/visio/room/${roomId}`).then((r) => r.json())
      .then((j) => setRoom(j.ok ? j.room : { title: 'Réunion Delivery Digital' }))
      .catch(() => setRoom({ title: 'Réunion Delivery Digital' }));
  }, [roomId]);

  if (fatal) return <Shell><Center><AlertCircle className="h-8 w-8 text-[#FF6B6B] mb-3" /><p className="text-[15px] font-semibold mb-1">{fatal}</p><button onClick={() => location.reload()} className="mt-3 px-5 py-2.5 rounded-full text-white text-[14px] font-semibold" style={{ background: BLUE }}>Réessayer</button></Center></Shell>;
  if (!room) return <Shell><Center><Loader2 className="h-6 w-6 animate-spin" /></Center></Shell>;
  if (!joined) return <Prejoin room={room} name={name} setName={setName} onJoin={() => { localStorage.setItem('dd_visio_name', name.trim() || 'Participant'); setJoined(true); }} />;
  return <Meeting roomId={roomId} room={room} name={name.trim() || 'Participant'} hostKey={hostKey} onFatal={setFatal} onLeave={() => setJoined(false)} />;
}

/* ============================== Habillage ============================== */

/**
 * Halo de diffusion : contour lumineux pendant qu'on partage son écran.
 *
 * Même intention que l'indicateur d'un assistant qui pilote un navigateur : signaler en
 * permanence, et sans qu'on ait à y penser, qu'une chose sensible sort de la machine. En
 * visioconférence, oublier qu'on diffuse son écran est l'incident le plus courant - et le
 * plus embarrassant. Un contour visible depuis n'importe quelle fenêtre le rappelle.
 *
 * Posé en superposition, sans interaction possible, pour ne rien intercepter des clics.
 * @author Rabah Ziane · 2026-07-21
 */
function HaloDiffusion({ actif }: { actif: boolean }) {
  if (!actif) return null;
  return (
    <>
      <div aria-hidden className="dd-halo-diffusion pointer-events-none fixed inset-0 z-[70]" />
      <div className="pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-[71] px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-2"
        style={{ background: 'rgba(255,138,0,0.14)', color: '#FF9F2E', border: '1px solid rgba(255,138,0,0.35)' }}>
        <span className="dd-halo-point h-2 w-2 rounded-full" style={{ background: '#FF8A00' }} />
        Votre écran est diffusé
      </div>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0E0F13] text-white flex flex-col">
      <header className="border-b border-white/10 px-4 sm:px-6 h-16 flex items-center gap-3 shrink-0">
        <img src={LOGO_URL} alt="Delivery Digital" className="h-7 w-auto invert" />
        <span className="text-white/30">|</span>
        <span className="text-[14px] font-semibold">Visioconférence</span>
      </header>
      {children}
    </div>
  );
}
const Center = ({ children }: { children: React.ReactNode }) => (
  <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">{children}</main>
);

/* ============================== Accès au micro et à la caméra ============================== */

const CONTRAINTE_AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

/**
 * Demande le micro et la caméra en tolérant la perte de l'un des deux.
 *
 * Les navigateurs rejettent getUserMedia en bloc : si la caméra est occupée par une autre
 * application ou refusée par le système, une demande combinée { video, audio } échoue
 * entièrement et on perd AUSSI le micro, alors qu'il fonctionne. On redemande donc chaque
 * périphérique séparément avant d'abandonner : le micro seul suffit à participer.
 * @author Rabah Ziane · 2026-07-21
 */
async function obtenirMedia(): Promise<{ stream: MediaStream; video: boolean; audio: boolean; souci: string; bloque: boolean }> {
  const essai = async (c: MediaStreamConstraints) => {
    try { return await navigator.mediaDevices.getUserMedia(c); } catch (e) { return e as DOMException; }
  };

  const ensemble = await essai({ video: true, audio: CONTRAINTE_AUDIO });
  if (ensemble instanceof MediaStream) return { stream: ensemble, video: true, audio: true, souci: '', bloque: false };

  const [audio, video] = await Promise.all([essai({ audio: CONTRAINTE_AUDIO }), essai({ video: true })]);
  const okAudio = audio instanceof MediaStream;
  const okVideo = video instanceof MediaStream;

  const stream = new MediaStream();
  if (okAudio) audio.getTracks().forEach((t) => stream.addTrack(t));
  if (okVideo) video.getTracks().forEach((t) => stream.addTrack(t));

  // La caméra prime dans le diagnostic : c'est elle qui échoue dans la quasi-totalité des cas.
  const cause = (!okVideo ? video as DOMException : null) || (!okAudio ? audio as DOMException : null);
  const bloque = cause?.name === 'NotAllowedError' ? await accesRefuseDurablement() : false;
  return { stream, video: okVideo, audio: okAudio, souci: messageMedia(okAudio, okVideo, cause, bloque), bloque };
}

/**
 * Le site est-il bloqué **durablement** pour ce périphérique ?
 *
 * Distinction essentielle : tant que l'état est « prompt », un nouvel appel déclenché par un
 * clic réaffiche la fenêtre d'autorisation du navigateur. S'il est « denied », plus aucune
 * fenêtre n'apparaîtra et il faut passer par la barre d'adresse - c'est le seul cas où l'on
 * affiche la marche à suivre. L'API n'existe pas partout : dans le doute, on ne bloque pas.
 * @author Rabah Ziane · 2026-07-21
 */
async function accesRefuseDurablement(): Promise<boolean> {
  try {
    const q = navigator.permissions?.query;
    if (!q) return false;
    const noms = ['camera', 'microphone'] as unknown as PermissionName[];
    const etats = await Promise.all(noms.map((name) => navigator.permissions.query({ name }).catch(() => null)));
    const connus = etats.filter(Boolean) as PermissionStatus[];
    return connus.length > 0 && connus.every((s) => s.state === 'denied');
  } catch { return false; }
}

/** Traduit l'échec en consigne actionnable, plutôt qu'en « périphérique inaccessible ». */
function messageMedia(okAudio: boolean, okVideo: boolean, cause: DOMException | null, bloque = false): string {
  if (okAudio && okVideo) return '';
  const quoi = !okAudio && !okVideo ? 'La caméra et le micro sont inaccessibles'
    : !okVideo ? 'La caméra est inaccessible'
    : 'Le micro est inaccessible';

  switch (cause?.name) {
    case 'NotAllowedError':
      return bloque
        ? `${quoi} : ce site a été bloqué dans les réglages du navigateur. Cliquez sur l'icône à gauche de la barre d'adresse, réautorisez la caméra et le micro, puis rechargez la page.`
        : `${quoi} tant que vous n'avez pas donné votre accord.`;
    case 'NotReadableError':
    case 'TrackStartError':
      return `${quoi} : une autre application les utilise déjà (Zoom, Teams, FaceTime, Photo Booth). Fermez-la, puis réessayez.`;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return `${quoi} : aucun périphérique de ce type n'est détecté sur cet appareil.`;
    default:
      return `${quoi}. Vous pouvez rejoindre quand même : vous verrez et entendrez les autres, et vous pourrez écrire dans le chat.`;
  }
}

/* ============================== Pré-entrée ============================== */

function Prejoin({ room, name, setName, onJoin }: { room: { title: string; client?: string; host?: string }; name: string; setName: (v: string) => void; onJoin: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const vivantRef = useRef(true);
  const [cam, setCam] = useState(true);
  const [mic, setMic] = useState(true);
  const [dispo, setDispo] = useState({ video: true, audio: true });
  const [chargement, setChargement] = useState(true);
  const [bloque, setBloque] = useState(false);
  const [err, setErr] = useState('');

  const demanderMedia = useCallback(async () => {
    setChargement(true);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const r = await obtenirMedia();
    if (!vivantRef.current) { r.stream.getTracks().forEach((t) => t.stop()); return; }

    streamRef.current = r.stream;
    if (videoRef.current) videoRef.current.srcObject = r.stream;
    setDispo({ video: r.video, audio: r.audio });
    setErr(r.souci);
    setBloque(r.bloque);
    // On n'entre en salle qu'avec ce qui existe vraiment : sinon la salle réactiverait
    // une piste absente et afficherait un micro « ouvert » qui n'émet rien.
    setCam(r.video); localStorage.setItem('dd_visio_cam', r.video ? '1' : '0');
    setMic(r.audio); localStorage.setItem('dd_visio_mic', r.audio ? '1' : '0');
    setChargement(false);
  }, []);

  useEffect(() => {
    vivantRef.current = true;
    demanderMedia();
    return () => { vivantRef.current = false; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [demanderMedia]);

  // L'aperçu ne sert qu'à se voir : les préférences réelles sont relues à l'entrée en salle.
  const toggle = (kind: 'video' | 'audio', on: boolean) => {
    const pistes = streamRef.current?.getTracks().filter((t) => t.kind === kind) || [];
    if (!pistes.length) return; // périphérique jamais obtenu : rien à basculer
    pistes.forEach((t) => { t.enabled = on; });
    if (kind === 'video') { setCam(on); localStorage.setItem('dd_visio_cam', on ? '1' : '0'); }
    else { setMic(on); localStorage.setItem('dd_visio_mic', on ? '1' : '0'); }
  };

  const manque = !dispo.video || !dispo.audio;
  const libelleRejoindre = !dispo.video && !dispo.audio ? 'Rejoindre sans caméra ni micro'
    : !dispo.video ? 'Rejoindre sans caméra'
    : 'Rejoindre sans micro';

  return (
    <Shell>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[880px] grid md:grid-cols-[1.3fr_1fr] gap-5 items-center">
          <div className="rounded-2xl overflow-hidden bg-black aspect-video relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
            {!cam && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#181A20] text-white/40 text-[14px]">
                {chargement ? <Loader2 className="h-5 w-5 animate-spin" /> : dispo.video ? 'Caméra désactivée' : 'Caméra indisponible'}
              </div>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              <button onClick={() => toggle('audio', !mic)} disabled={!dispo.audio} title={dispo.audio ? 'Micro' : 'Micro indisponible'}
                className={`h-11 w-11 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${mic ? 'bg-white/15 hover:bg-white/25' : 'bg-[#FF3B30]'}`}>{mic ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</button>
              <button onClick={() => toggle('video', !cam)} disabled={!dispo.video} title={dispo.video ? 'Caméra' : 'Caméra indisponible'}
                className={`h-11 w-11 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${cam ? 'bg-white/15 hover:bg-white/25' : 'bg-[#FF3B30]'}`}>{cam ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}</button>
            </div>
          </div>
          <div>
            <h1 className="text-[22px] font-bold leading-tight mb-1">{room.title}</h1>
            {room.client && <p className="text-[13.5px] text-white/50 mb-1">{room.client}</p>}
            {room.host && <p className="text-[13.5px] text-white/50">Animé par {room.host}</p>}
            <label className="block mt-5">
              <span className="text-[12px] font-semibold text-white/60">Votre nom</span>
              <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onJoin(); }} placeholder="Prénom Nom" autoFocus
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#181A20] border border-white/10 text-[14px] text-white placeholder-white/30 outline-none" />
            </label>
            {err && (
              <div className="mt-3 rounded-xl border border-[#E5B567]/30 bg-[#E5B567]/10 p-3">
                <p className="text-[12.5px] text-[#E5B567] leading-[1.55]">{err}</p>
                {/* Bloqué durablement : aucune fenêtre ne s'ouvrira, seul un rechargement aidera. */}
                {bloque && (
                  <button onClick={() => location.reload()}
                    className="mt-2.5 text-[12.5px] font-semibold text-white/90 hover:text-white underline underline-offset-2">
                    J&apos;ai réautorisé, recharger la page
                  </button>
                )}
              </div>
            )}

            {/* La demande est relancée par un clic : c'est ce qui fait réapparaître la fenêtre
                d'autorisation de Chrome, qu'un appel automatique au chargement n'obtient plus. */}
            {!bloque && manque && (
              <button onClick={demanderMedia} disabled={chargement}
                className="mt-4 w-full px-5 py-3 rounded-full bg-white text-black text-[15px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-white/90 transition-colors">
                {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                Autoriser la caméra et le micro
              </button>
            )}

            <button onClick={onJoin} disabled={!name.trim()}
              className={`w-full px-5 py-3 rounded-full text-[15px] font-semibold disabled:opacity-50 ${manque ? 'mt-2.5 bg-white/10 hover:bg-white/15 text-white' : 'mt-4 text-white'}`}
              style={manque ? undefined : { background: BLUE }}>
              {manque ? libelleRejoindre : 'Rejoindre la réunion'}
            </button>
            <p className="text-[11.5px] text-white/35 mt-3">Aucune installation nécessaire. Votre audio et votre vidéo circulent directement entre les participants.</p>
          </div>
        </div>
      </main>
    </Shell>
  );
}

/* ============================== En réunion ============================== */

function Meeting({ roomId, room, name, hostKey, onFatal, onLeave }: { roomId: string; room: { title: string }; name: string; hostKey: string; onFatal: (m: string) => void; onLeave: () => void }) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [muted, setMuted] = useState(() => localStorage.getItem('dd_visio_mic') === '0');
  const [camOff, setCamOff] = useState(() => localStorage.getItem('dd_visio_cam') === '0');
  const [sharing, setSharing] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'connecting' | 'live' | 'lost'>('connecting');
  // Salle d'attente : tant que le formateur n'a pas admis, on patiente. @Rabah 2026-07-20
  const [phase, setPhase] = useState<'connecting' | 'waiting' | 'in' | 'denied'>('connecting');
  const [hostPresent, setHostPresent] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [lobby, setLobby] = useState<{ id: string; name: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [lobbyOpen, setLobbyOpen] = useState(true);
  // Problème de périphérique signalé en salle, sans empêcher de participer. @Rabah 2026-07-21
  const [souciMedia, setSouciMedia] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localRef = useRef<MediaStream | null>(null);
  const camTrackRef = useRef<MediaStreamTrack | null>(null);
  const iceRef = useRef<RTCIceServer[]>([]);
  const selfIdRef = useRef('');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  /**
   * Flux affiché dans sa propre tuile : caméra, ou écran pendant un partage.
   *
   * Pourquoi un état plutôt qu'une affectation directe à l'élément vidéo : le média peut
   * arriver AVANT que la tuile ne soit montée - c'est le cas quand on patiente en salle
   * d'attente. L'affectation tombait alors dans le vide et la tuile restait noire, sans que
   * rien ne vienne jamais la remplir. En passant par un état, React réattribue le flux dès
   * que l'élément existe. @author Rabah Ziane · 2026-07-21
   */
  const [fluxLocal, setFluxLocal] = useState<MediaStream | null>(null);

  const upsertPeer = useCallback((id: string, patch: Partial<Peer>) => {
    setPeers((prev) => prev.some((p) => p.id === id) ? prev.map((p) => p.id === id ? { ...p, ...patch } : p) : [...prev, { id, name: 'Participant', state: { muted: false, camOff: false, sharing: false }, ...patch } as Peer]);
  }, []);

  const sendWs = useCallback((payload: any) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(payload));
  }, []);

  /** Une connexion par pair ; `polite=false` (l'arrivant) est celui qui émet l'offre. */
  const makePc = useCallback((peerId: string, initiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: iceRef.current, iceCandidatePoolSize: 2 });
    pcsRef.current.set(peerId, pc);
    localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current as MediaStream));
    // Sans piste à émettre, l'offre ne déclarerait aucun flux et on ne recevrait rien non plus :
    // on ouvre explicitement le sens descendant pour continuer à voir et entendre les autres.
    if (!localRef.current?.getAudioTracks().length) pc.addTransceiver('audio', { direction: 'recvonly' });
    if (!localRef.current?.getVideoTracks().length) pc.addTransceiver('video', { direction: 'recvonly' });
    pc.onicecandidate = (e) => { if (e.candidate) sendWs({ t: 'signal', to: peerId, data: { candidate: e.candidate } }); };
    pc.ontrack = (e) => upsertPeer(peerId, { stream: e.streams[0] });
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') pc.restartIce();
    };
    if (initiator) {
      pc.onnegotiationneeded = async () => {
        try {
          await pc.setLocalDescription(await pc.createOffer());
          sendWs({ t: 'signal', to: peerId, data: { sdp: pc.localDescription } });
        } catch { /* renégociation concurrente */ }
      };
    }
    return pc;
  }, [sendWs, upsertPeer]);

  const dropPeer = useCallback((peerId: string) => {
    pcsRef.current.get(peerId)?.close();
    pcsRef.current.delete(peerId);
    pendingIceRef.current.delete(peerId);
    setPeers((prev) => prev.filter((p) => p.id !== peerId));
  }, []);

  const hangup = useCallback(() => {
    try { wsRef.current?.close(); } catch { /* déjà fermée */ }
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    onLeave();
  }, [onLeave]);

  /* --- Entrée en salle : média local, config ICE, puis signalisation --- */
  useEffect(() => {
    let dead = false;
    (async () => {
      // Le repli est géré dans obtenirMedia : perdre la caméra ne doit pas coûter le micro.
      // Sans aucun périphérique on entre quand même : on suit et on écrit dans le chat.
      const media = await obtenirMedia();
      const stream = media.stream;
      if (media.souci) setSouciMedia(media.souci);
      if (dead) { stream.getTracks().forEach((t) => t.stop()); return; }
      localRef.current = stream;
      camTrackRef.current = stream.getVideoTracks()[0] || null;
      stream.getAudioTracks().forEach((t) => { t.enabled = !muted; });
      stream.getVideoTracks().forEach((t) => { t.enabled = !camOff; });
      setFluxLocal(stream);

      try {
        const j = await fetch('/api/visio/ice').then((r) => r.json());
        iceRef.current = j.iceServers || [];
      } catch { iceRef.current = []; }

      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/visio`);
      wsRef.current = ws;
      ws.onopen = () => { setStatus('live'); ws.send(JSON.stringify({ t: 'join', room: roomId, name, hostKey })); };
      ws.onclose = () => { if (!dead) setStatus('lost'); };
      ws.onerror = () => { if (!dead) setStatus('lost'); };
      ws.onmessage = async (ev) => {
        let m: any;
        try { m = JSON.parse(ev.data); } catch { return; }

        if (m.t === 'waiting') {
          setPhase('waiting'); setHostPresent(!!m.hostPresent);
        } else if (m.t === 'denied') {
          setPhase('denied');
        } else if (m.t === 'lobby') {
          setLobby((l) => m.action === 'join' ? [...l.filter((x) => x.id !== m.id), { id: m.id, name: m.name }] : l.filter((x) => x.id !== m.id));
        } else if (m.t === 'welcome') {
          selfIdRef.current = m.selfId;
          setPhase('in'); setIsHost(!!m.isHost); setLobby(m.waiting || []);
          // On appelle ceux qui étaient déjà là ; les suivants nous appelleront.
          for (const p of m.peers as Peer[]) { upsertPeer(p.id, { name: p.name, state: p.state }); makePc(p.id, true); }
        } else if (m.t === 'peer-join') {
          upsertPeer(m.id, { name: m.name, state: m.state });
        } else if (m.t === 'peer-leave') {
          dropPeer(m.id);
        } else if (m.t === 'peer-state') {
          upsertPeer(m.id, { state: m.state });
        } else if (m.t === 'chat') {
          setChat((c) => [...c, { id: m.id, name: m.name, text: m.text, at: m.at }]);
          setUnread((u) => u + 1);
        } else if (m.t === 'error') {
          onFatal(m.code === 'room_full' ? 'Cette réunion est complète.' : 'Connexion à la réunion impossible.');
        } else if (m.t === 'signal') {
          const from = m.from as string;
          const pc = pcsRef.current.get(from) || makePc(from, false);
          const data = m.data || {};
          if (data.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            // Les candidats arrivés trop tôt n'étaient pas applicables : on les rejoue.
            const queued = pendingIceRef.current.get(from) || [];
            for (const c of queued) { try { await pc.addIceCandidate(c); } catch { /* candidat périmé */ } }
            pendingIceRef.current.delete(from);
            if (data.sdp.type === 'offer') {
              await pc.setLocalDescription(await pc.createAnswer());
              sendWs({ t: 'signal', to: from, data: { sdp: pc.localDescription } });
            }
          } else if (data.candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) { try { await pc.addIceCandidate(data.candidate); } catch { /* candidat périmé */ } }
            else pendingIceRef.current.set(from, [...(pendingIceRef.current.get(from) || []), data.candidate]);
          }
        }
      };
    })();
    return () => {
      dead = true;
      try { wsRef.current?.close(); } catch { /* déjà fermée */ }
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      localRef.current?.getTracks().forEach((t) => t.stop());
    };
    // Volontairement monté une seule fois : la salle se ferme via hangup().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /* --- Commandes --- */
  const toggleMic = () => {
    const on = muted; // on rallume si on était coupé
    localRef.current?.getAudioTracks().forEach((t) => { t.enabled = on; });
    setMuted(!on); sendWs({ t: 'state', muted: !on, camOff, sharing });
  };
  const toggleCam = () => {
    const on = camOff;
    localRef.current?.getVideoTracks().forEach((t) => { t.enabled = on; });
    setCamOff(!on); sendWs({ t: 'state', muted, camOff: !on, sharing });
  };

  // Partage d'écran : on remplace la piste vidéo chez tous les pairs, sans renégocier.
  const replaceVideoTrack = (track: MediaStreamTrack | null) => {
    pcsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(track).catch(() => { /* pair en cours de fermeture */ });
    });
  };
  const stopSharing = () => {
    replaceVideoTrack(camTrackRef.current);
    setFluxLocal(localRef.current);
    setSharing(false); sendWs({ t: 'state', muted, camOff, sharing: false });
  };
  const toggleShare = async () => {
    if (sharing) return stopSharing();
    try {
      const disp = await (navigator.mediaDevices as any).getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      const track: MediaStreamTrack = disp.getVideoTracks()[0];
      replaceVideoTrack(track);
      setFluxLocal(disp);
      setSharing(true); sendWs({ t: 'state', muted, camOff, sharing: true });
      track.onended = () => stopSharing(); // clic sur "Arrêter le partage" du navigateur
    } catch { /* partage refusé */ }
  };

  const sendChat = () => {
    const text = draft.trim();
    if (!text) return;
    sendWs({ t: 'chat', text });
    setChat((c) => [...c, { id: 'me', name, text, at: Date.now(), self: true }]);
    setDraft('');
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* refusé */ }
  };

  /* Salle d'attente : on garde la connexion ouverte, le formateur décide. */
  if (phase === 'denied') return (
    <Shell><Center>
      <AlertCircle className="h-8 w-8 text-[#FF6B6B] mb-3" />
      <p className="text-[15px] font-semibold mb-1">Accès refusé</p>
      <p className="text-[13px] text-white/50">Le formateur n'a pas autorisé votre entrée dans cette réunion.</p>
    </Center></Shell>
  );
  // Salle d'attente : l'apprenant doit comprendre du premier coup d'œil qu'il n'a rien raté,
  // qu'il est bien connecté, et qu'il attend simplement la validation du formateur.
  if (phase !== 'in') return (
    <Shell><Center>
      <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-[#181A20] p-7">
        <div className="relative h-20 w-20 mx-auto mb-5">
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: `${BLUE}33` }} />
          <span className="absolute inset-0 rounded-full" style={{ background: `${BLUE}1f` }} />
          <span className="absolute inset-0 flex items-center justify-center"><Clock className="h-8 w-8" style={{ color: BLUE }} /></span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-bold uppercase tracking-wide mb-3"
          style={{ background: `${BLUE}1f`, color: BLUE }}>
          <Loader2 className="h-3 w-3 animate-spin" /> En attente de validation
        </span>

        <h1 className="text-[22px] font-bold mb-2">Vous êtes en salle d'attente</h1>
        <p className="text-[14px] text-white/60 leading-relaxed mb-5">
          {hostPresent
            ? 'Le formateur a été prévenu de votre arrivée. Il va vous faire entrer dans un instant.'
            : "La réunion n'est pas encore ouverte. Vous entrerez automatiquement dès que le formateur arrivera."}
        </p>

        <div className="rounded-xl bg-[#0E0F13] border border-white/10 px-4 py-3 text-left mb-4">
          <div className="text-[11px] uppercase tracking-wide text-white/35 font-semibold mb-1">Vous vous présentez comme</div>
          <div className="text-[15px] font-semibold">{name}</div>
        </div>

        <p className="text-[12.5px] text-[#E5B567] mb-5 inline-flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> Ne fermez pas cette page, l'entrée est automatique.
        </p>

        <div>
          <button onClick={hangup} className="px-5 py-2.5 rounded-full bg-white/8 hover:bg-white/12 text-[13.5px] font-semibold">Quitter la salle d'attente</button>
        </div>
      </div>
    </Center></Shell>
  );

  const tiles = peers.length + 1;
  const cols = tiles <= 1 ? 1 : tiles <= 4 ? 2 : tiles <= 9 ? 3 : 4;

  return (
    <div className="min-h-screen h-screen bg-[#0E0F13] text-white flex flex-col overflow-hidden">
      <HaloDiffusion actif={sharing} />
      <header className="border-b border-white/10 px-4 sm:px-6 h-14 flex items-center gap-3 shrink-0">
        <img src={LOGO_URL} alt="Delivery Digital" className="h-6 w-auto invert" />
        <span className="text-white/30 hidden sm:inline">|</span>
        <span className="text-[13.5px] font-semibold truncate">{room.title}</span>
        {status === 'lost' && <span className="text-[12px] text-[#FF6B6B] ml-2">Connexion perdue</span>}
        {status === 'connecting' && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12.5px] text-white/50 inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {tiles}</span>
          <button onClick={copyLink} className="px-3 py-1.5 rounded-full bg-white/8 hover:bg-white/12 text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Copy className="h-3.5 w-3.5" /> {copied ? 'Copié' : 'Lien'}</button>
          {isHost && lobby.length > 0 && (
            <button onClick={() => setLobbyOpen((o) => !o)} className="px-3.5 py-1.5 rounded-full text-black text-[12.5px] font-bold inline-flex items-center gap-1.5" style={{ background: '#E5B567' }}>
              <UserPlus className="h-3.5 w-3.5" /> {lobby.length} en attente
            </button>
          )}
        </div>
      </header>

      {/* Demandes d'entrée : c'est l'action la plus urgente pour le formateur, elle doit
          sauter aux yeux et se traiter en un clic. @Rabah 2026-07-20 */}
      {isHost && lobbyOpen && lobby.length > 0 && (
        <div className="border-b-2 shrink-0" style={{ borderColor: '#E5B567', background: 'rgba(229,181,103,0.12)' }}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <span className="text-[14px] font-bold inline-flex items-center gap-2" style={{ color: '#E5B567' }}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: '#E5B567' }} />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: '#E5B567' }} />
                </span>
                {/* Le nom parle plus qu'un décompte : le formateur reconnaît son apprenant. */}
                {lobby.length === 1
                  ? `${lobby[0].name} souhaite rejoindre la réunion`
                  : lobby.length === 2
                    ? `${lobby[0].name} et ${lobby[1].name} souhaitent rejoindre la réunion`
                    : `${lobby[0].name} et ${lobby.length - 1} autres souhaitent rejoindre la réunion`}
              </span>
              {lobby.length > 1 && (
                <button onClick={() => { lobby.forEach((w) => sendWs({ t: 'admit', id: w.id })); setLobby([]); }}
                  className="px-4 py-2 rounded-full text-white text-[13px] font-bold" style={{ background: BLUE }}>
                  Admettre tout le monde
                </button>
              )}
            </div>

            <div className="space-y-2">
              {lobby.map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-xl bg-[#0E0F13] border border-white/10 px-3 py-2.5 flex-wrap">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0" style={{ background: `${BLUE}2b`, color: BLUE }}>
                    {w.name.trim().split(/\s+/).slice(0, 2).map((x) => x[0] ?? '').join('').toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-semibold truncate">{w.name}</div>
                    <div className="text-[12px] text-white/45">attend votre autorisation</div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => { sendWs({ t: 'admit', id: w.id }); setLobby((l) => l.filter((x) => x.id !== w.id)); }}
                      className="px-5 py-2 rounded-full text-white text-[13.5px] font-bold" style={{ background: BLUE }}>Admettre</button>
                    <button onClick={() => { sendWs({ t: 'deny', id: w.id }); setLobby((l) => l.filter((x) => x.id !== w.id)); }}
                      className="px-4 py-2 rounded-full bg-white/8 hover:bg-white/12 text-[13.5px] font-semibold text-white/70">Refuser</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {souciMedia && (
        <div className="shrink-0 px-4 sm:px-6 py-2.5 flex items-start gap-2.5 border-b border-[#E5B567]/25" style={{ background: 'rgba(229,181,103,0.10)' }}>
          <AlertCircle className="h-4 w-4 text-[#E5B567] shrink-0 mt-[1px]" />
          <p className="text-[12.5px] text-[#E5B567] leading-[1.5] flex-1">{souciMedia}</p>
          <button onClick={() => setSouciMedia('')} className="text-white/40 hover:text-white/80 shrink-0" aria-label="Masquer"><X className="h-4 w-4" /></button>
        </div>
      )}

      <main className="flex-1 flex min-h-0">
        <div className="flex-1 p-3 min-h-0">
          <div className="h-full grid gap-3 auto-rows-fr" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            <Tile name={`${name} (vous)`} muted={muted} camOff={camOff && !sharing} sharing={sharing} self stream={fluxLocal || undefined} videoRef={localVideoRef} />
            {peers.map((p) => <Tile key={p.id} name={p.name} muted={p.state.muted} camOff={p.state.camOff && !p.state.sharing} sharing={p.state.sharing} stream={p.stream} />)}
          </div>
        </div>

        {chatOpen && (
          <aside className="w-[320px] border-l border-white/10 flex flex-col shrink-0">
            <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
              <span className="text-[13px] font-semibold">Messages</span>
              <button onClick={() => setChatOpen(false)} className="p-1 rounded-lg text-white/50 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {chat.length === 0 && <p className="text-[12.5px] text-white/35">Les messages sont visibles par tous les participants et disparaissent à la fin de la réunion.</p>}
              {chat.map((c, i) => (
                <div key={i}>
                  <div className="text-[11.5px] text-white/40">{c.self ? 'Vous' : c.name}</div>
                  <div className="text-[13.5px] text-white/90 break-words">{c.text}</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-white/10 flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} placeholder="Message" className="flex-1 px-3 py-2 rounded-lg bg-[#181A20] border border-white/10 text-[13px] text-white placeholder-white/30 outline-none" />
              <button onClick={sendChat} className="px-3 rounded-lg" style={{ background: BLUE }}><Send className="h-4 w-4" /></button>
            </div>
          </aside>
        )}
      </main>

      <footer className="border-t border-white/10 h-[72px] flex items-center justify-center gap-2.5 shrink-0">
        <Ctrl on={!muted} onClick={toggleMic} title={muted ? 'Activer le micro' : 'Couper le micro'}>{muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</Ctrl>
        <Ctrl on={!camOff} onClick={toggleCam} title={camOff ? 'Activer la caméra' : 'Couper la caméra'}>{camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}</Ctrl>
        <Ctrl on={sharing} active={sharing} onClick={toggleShare} title={sharing ? 'Arrêter le partage' : "Partager l'écran"}><MonitorUp className="h-5 w-5" /></Ctrl>
        <Ctrl on onClick={() => { setChatOpen((o) => !o); setUnread(0); }} title="Messages">
          <span className="relative"><MessageSquare className="h-5 w-5" />{unread > 0 && !chatOpen && <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-[#FF3B30] text-[10px] font-bold flex items-center justify-center">{unread}</span>}</span>
        </Ctrl>
        <button onClick={hangup} title="Quitter" className="h-12 px-6 rounded-full bg-[#FF3B30] hover:bg-[#e0342a] flex items-center justify-center"><PhoneOff className="h-5 w-5" /></button>
      </footer>
    </div>
  );
}

function Ctrl({ children, on, active, onClick, title }: { children: React.ReactNode; on: boolean; active?: boolean; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title}
      className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${active ? 'text-white' : on ? 'bg-white/10 hover:bg-white/18' : 'bg-[#FF3B30] hover:bg-[#e0342a]'}`}
      style={active ? { background: BLUE } : undefined}>
      {children}
    </button>
  );
}

function Tile({ name, muted, camOff, sharing, stream, self, videoRef }: { name: string; muted: boolean; camOff: boolean; sharing: boolean; stream?: MediaStream; self?: boolean; videoRef?: React.RefObject<HTMLVideoElement> }) {
  const ref = useRef<HTMLVideoElement>(null);
  const el = videoRef || ref;
  // On attribue le flux dès que l'élément ET le flux existent, sans se soucier de l'ordre.
  // La condition « pas de ref fournie » excluait justement la tuile locale, seule à en
  // recevoir une : elle n'était donc jamais alimentée ici. @Rabah 2026-07-21
  useEffect(() => {
    if (el.current && stream && el.current.srcObject !== stream) el.current.srcObject = stream;
  }, [stream, el]);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#181A20] min-h-0">
      <video ref={el} autoPlay playsInline muted={!!self} className={`w-full h-full object-cover ${self && !sharing ? '-scale-x-100' : ''} ${camOff ? 'invisible' : ''}`} />
      {camOff && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold">{initials || '?'}</div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
        <span className="px-2 py-1 rounded-lg bg-black/55 text-[12px] font-medium truncate">{name}</span>
        {muted && <span className="h-6 w-6 rounded-lg bg-black/55 flex items-center justify-center"><MicOff className="h-3.5 w-3.5 text-[#FF6B6B]" /></span>}
        {sharing && <span className="px-2 py-1 rounded-lg text-[11px] font-semibold" style={{ background: BLUE }}>Partage d'écran</span>}
      </div>
    </div>
  );
}
