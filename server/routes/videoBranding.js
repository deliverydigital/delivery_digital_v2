/**
 * Branding centralisé du générateur de vidéos "Hacœur".
 * Modifiez ces valeurs pour changer l'identité visuelle / la voix de toutes les vidéos.
 * @author Rabah Ziane - 2026-06-05
 */
export const BRANDING = {
  name: 'Hacœur',
  // Palette : vert / noir
  bg: '0x0B0B0B',          // noir (format ffmpeg 0xRRGGBB)
  accent: '0x00E08A',      // vert
  accentText: '#00E08A',   // vert (ASS/CSS)
  white: '0xFFFFFF',
  // Police monospace (présente sur le serveur)
  font: '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
  logo: '',                // PNG absolu serveur, vide = texte seul
  // Intro / outro
  introTitle: 'Hacœur',
  introTag: 'LE MÉTIER DU JOUR',
  outroTitle: 'Hacœur',
  outroTag: 'Abonne-toi pour le prochain hack',
  introSeconds: 2.6,
  outroSeconds: 2.6,
  // Sous-titres
  subFontSizeRatio: 0.045, // taille police = ratio * hauteur vidéo
  // Voix off "hacker" captivante : voix masculine FR + effet cyber (pitch + écho léger).
  // Durée préservée (asetrate+atempo) -> les sous-titres restent synchronisés. Vide = sans effet.
  voiceFx: 'asetrate=44100*0.94,aresample=44100,atempo=1.0638,aecho=0.8:0.88:38:0.18,highpass=f=80,lowpass=f=9000',
};

// Moteur de voix off par défaut : 'edge' (gratuit, Microsoft) ou 'elevenlabs' (payant).
export const DEFAULT_ENGINE = process.env.VIDEO_TTS_ENGINE || 'edge';
// Edge-TTS (gratuit) : voix FR masculine "hacker" par défaut. fr-FR-HenriNeural (grave) ou fr-FR-DeniseNeural (féminine).
export const EDGE_VOICE = process.env.EDGE_TTS_VOICE || 'fr-FR-HenriNeural';
// ElevenLabs (optionnel, payant)
export const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '';
export const ELEVEN_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
