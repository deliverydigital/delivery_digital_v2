/**
 * Pipeline de génération vidéo "Hacœur" - GRATUIT par défaut (sans OpenAI).
 *  1. Voix off : Edge-TTS (Microsoft, gratuit) avec sous-titres synchronisés, OU ElevenLabs
 *     (optionnel, payant). Effet "hacker" (pitch + écho) appliqué, durée préservée.
 *  2. Sous-titres .ass construits depuis les timings de la voix (pas de Whisper).
 *  3. Assemblage FFmpeg : intro animée + capture (optionnelle, calée sur la voix ; sinon
 *     fond brandé) + voix off + sous-titres incrustés + outro, en MP4 1080p, par format.
 * @author Rabah Ziane - 2026-06-05
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import VideoJob from '../models/VideoJob.js';
import { BRANDING, DEFAULT_ENGINE, EDGE_VOICE, DEFAULT_VOICE_ID, ELEVEN_MODEL_ID } from './videoBranding.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.resolve(__dirname, '../../uploads');
const OUT_DIR = path.join(UPLOADS, 'hacoeur');
const EDGE_BIN = process.env.EDGE_TTS_BIN || path.join(os.homedir(), 'edgetts-venv/bin/edge-tts');

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args);
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${path.basename(bin)} exit ${code}: ${err.slice(-500)}`)));
  });
}
async function ffprobeDuration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
    let out = ''; p.stdout.on('data', (d) => { out += d.toString(); });
    p.on('close', () => resolve(parseFloat(out.trim()) || 0)); p.on('error', reject);
  });
}
const dims = (format) => format === '9:16' ? { W: 1080, H: 1920 } : { W: 1920, H: 1080 };

// --- Voix off : Edge-TTS (gratuit) ---
function srtTime(t) { const m = t.match(/(\d+):(\d+):(\d+)[,.](\d+)/); if (!m) return 0; return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000; }
function parseSrt(txt) {
  const cues = [];
  for (const block of txt.replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n').filter(Boolean);
    const ti = lines.findIndex((l) => l.includes('-->'));
    if (ti < 0) continue;
    const [a, b] = lines[ti].split('-->');
    const text = lines.slice(ti + 1).join(' ').trim();
    if (text) cues.push({ start: srtTime(a), end: srtTime(b), text });
  }
  return cues;
}
async function edgeTTS(script, voice, outMp3, outSrt) {
  await run(EDGE_BIN, ['--voice', voice || EDGE_VOICE, '--text', script, '--write-media', outMp3, '--write-subtitles', outSrt]);
  const srt = await fs.readFile(outSrt, 'utf8').catch(() => '');
  return parseSrt(srt);
}

// --- Voix off : ElevenLabs (optionnel, payant) -> cues depuis l'alignement caractères ---
async function elevenTTS(script, voiceId, outMp3) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY manquante.');
  const vid = voiceId || DEFAULT_VOICE_ID;
  if (!vid) throw new Error('voice_id ElevenLabs manquant.');
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}/with-timestamps`, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: script, model_id: ELEVEN_MODEL_ID, output_format: 'mp3_44100_128' }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 250)}`);
  const j = await r.json();
  await fs.writeFile(outMp3, Buffer.from(j.audio_base64, 'base64'));
  const al = j.alignment || j.normalized_alignment;
  const chars = al?.characters || [], st = al?.character_start_times_seconds || [], en = al?.character_end_times_seconds || [];
  const words = []; let cur = null;
  for (let i = 0; i < chars.length; i++) { const c = chars[i]; if (/\s/.test(c)) { if (cur) { words.push(cur); cur = null; } continue; } if (!cur) cur = { text: '', start: st[i] || 0, end: en[i] || 0 }; cur.text += c; cur.end = en[i] || cur.end; }
  if (cur) words.push(cur);
  const cues = [];
  for (let i = 0; i < words.length; i += 6) { const g = words.slice(i, i + 6); if (g.length) cues.push({ start: g[0].start, end: g[g.length - 1].end, text: g.map((w) => w.text).join(' ') }); }
  return cues;
}

// Effet voix "hacker" (durée préservée -> sous-titres toujours synchronisés).
async function applyVoiceFx(inMp3, outMp3) {
  if (!BRANDING.voiceFx) { await fs.copyFile(inMp3, outMp3); return; }
  await run('ffmpeg', ['-y', '-i', inMp3, '-af', BRANDING.voiceFx, '-c:a', 'libmp3lame', '-q:a', '2', outMp3]);
}

// --- Sous-titres .ass depuis les cues ---
const assTime = (s) => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60); return `${h}:${String(m).padStart(2, '0')}:${String(sec.toFixed(2)).padStart(5, '0')}`; };
function buildAss(cues, W, H) {
  const fontSize = Math.round(H * BRANDING.subFontSizeRatio);
  const marginV = Math.round(H * 0.10);
  const head = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV
Style: Hac,DejaVu Sans Mono,${fontSize},&H008AE000,&H00000000,&H96000000,1,3,4,1,2,80,80,${marginV}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const lines = cues.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Hac,,0,0,0,,${String(c.text).replace(/[\r\n]+/g, ' ').replace(/\{/g, '(').replace(/\}/g, ')')}`);
  return head + lines.join('\n') + '\n';
}

// --- Intro / outro brandées ---
async function makeCard(dir, name, W, H, seconds, title, tag, sub) {
  const out = path.join(dir, `${name}.mp4`);
  const tf = path.join(dir, `${name}_t.txt`), gf = path.join(dir, `${name}_g.txt`), sf = path.join(dir, `${name}_s.txt`);
  await fs.writeFile(tf, title || ' '); await fs.writeFile(gf, tag || ' '); await fs.writeFile(sf, sub || ' ');
  const f = BRANDING.font, big = Math.round(H * 0.085), mid = Math.round(H * 0.030), small = Math.round(H * 0.026);
  const vf = [
    `drawbox=x=(iw/2-${Math.round(W * 0.18)}):y=(ih/2-${Math.round(H * 0.16)}):w=${Math.round(W * 0.36)}:h=6:color=${BRANDING.accent}:t=fill`,
    `drawtext=fontfile='${f}':textfile='${tf}':fontcolor=${BRANDING.accent}:fontsize=${big}:x=(w-text_w)/2:y=(h-text_h)/2-${Math.round(H * 0.03)}`,
    `drawtext=fontfile='${f}':textfile='${gf}':fontcolor=${BRANDING.white}:fontsize=${mid}:x=(w-text_w)/2:y=(h/2)+${Math.round(H * 0.05)}`,
    `drawtext=fontfile='${f}':textfile='${sf}':fontcolor=0xBBBBBB:fontsize=${small}:x=(w-text_w)/2:y=(h/2)+${Math.round(H * 0.10)}`,
    `fade=t=in:st=0:d=0.4,fade=t=out:st=${(seconds - 0.4).toFixed(2)}:d=0.4`,
  ].join(',');
  await run('ffmpeg', ['-y', '-f', 'lavfi', '-i', `color=c=${BRANDING.bg}:s=${W}x${H}:r=30:d=${seconds}`,
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-vf', vf, '-t', String(seconds),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-shortest', out]);
  return out;
}

// --- Segment principal : capture (si fournie, calée sur la voix) ou fond brandé ---
async function makeMain(dir, W, H, source, voice, assFile, duration, metier) {
  const out = path.join(dir, `main_${W}x${H}.mp4`);
  const assEsc = assFile.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
  if (source) {
    const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${BRANDING.bg},setsar=1,subtitles='${assEsc}'`;
    await run('ffmpeg', ['-y', '-stream_loop', '-1', '-i', source, '-i', voice, '-vf', vf, '-t', String(duration),
      '-map', '0:v:0', '-map', '1:a:0', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-shortest', out]);
  } else {
    // Pas de capture : fond brandé + titre métier + sous-titres.
    const mf = path.join(dir, `metier_${W}x${H}.txt`); await fs.writeFile(mf, (metier || 'Hacœur').toUpperCase());
    const vf = `drawtext=fontfile='${BRANDING.font}':textfile='${mf}':fontcolor=${BRANDING.accent}:fontsize=${Math.round(H * 0.06)}:x=(w-text_w)/2:y=${Math.round(H * 0.16)},subtitles='${assEsc}'`;
    await run('ffmpeg', ['-y', '-f', 'lavfi', '-i', `color=c=${BRANDING.bg}:s=${W}x${H}:r=30:d=${duration}`, '-i', voice,
      '-vf', vf, '-t', String(duration), '-map', '0:v:0', '-map', '1:a:0', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-shortest', out]);
  }
  return out;
}

async function concat(dir, parts, out) {
  const inputs = parts.flatMap((p) => ['-i', p]);
  const streams = parts.map((_, i) => `[${i}:v][${i}:a]`).join('');
  await run('ffmpeg', ['-y', ...inputs, '-filter_complex', `${streams}concat=n=${parts.length}:v=1:a=1[v][a]`,
    '-map', '[v]', '-map', '[a]', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-b:v', '6M', '-c:a', 'aac', '-ar', '44100', out]);
  return out;
}

export async function runVideoJob(jobId) {
  const job = await VideoJob.findById(jobId);
  if (!job) return;
  const dir = path.join(OUT_DIR, String(job._id));
  const setp = async (progress, step) => { job.progress = progress; job.step = step; await job.save(); };
  try {
    job.status = 'processing'; await setp(5, 'Préparation');
    await fs.mkdir(dir, { recursive: true });

    const engine = job.engine || DEFAULT_ENGINE;
    await setp(12, `Voix off (${engine === 'edge' ? 'gratuite' : 'ElevenLabs'})`);
    const rawVoice = path.join(dir, 'voice_raw.mp3');
    let cues;
    if (engine === 'elevenlabs') cues = await elevenTTS(job.script || '', job.voiceId, rawVoice);
    else cues = await edgeTTS(job.script || '', job.voiceId, rawVoice, path.join(dir, 'voice.srt'));

    await setp(28, 'Effet voix (cyber)');
    const voice = path.join(dir, 'voice.mp3');
    await applyVoiceFx(rawVoice, voice);
    job.audioUrl = `/uploads/hacoeur/${job._id}/voice.mp3`;

    await setp(38, 'Analyse de la voix');
    const duration = Math.max(1, await ffprobeDuration(voice));
    job.audioDuration = Math.round(duration * 100) / 100;

    await setp(45, 'Sous-titres synchronisés');
    const sourceAbs = job.sourceVideo ? path.join(UPLOADS, job.sourceVideo.replace(/^\/?uploads\//, '')) : null;
    const formats = (job.formats && job.formats.length ? job.formats : ['16:9']);
    const outputs = []; let done = 0;
    for (const fmt of formats) {
      const { W, H } = dims(fmt);
      await setp(50 + Math.round((done / formats.length) * 45), `Montage ${fmt} (1080p)`);
      const assFile = path.join(dir, `subs_${W}x${H}.ass`);
      await fs.writeFile(assFile, buildAss(cues, W, H));
      const intro = await makeCard(dir, `intro_${W}x${H}`, W, H, BRANDING.introSeconds, BRANDING.introTitle, BRANDING.introTag, job.metier || '');
      const outro = await makeCard(dir, `outro_${W}x${H}`, W, H, BRANDING.outroSeconds, BRANDING.outroTitle, BRANDING.outroTag, '');
      const main = await makeMain(dir, W, H, sourceAbs, voice, assFile, duration, job.metier);
      const finalName = `hacoeur_${(job.metier || 'video').replace(/[^a-z0-9]/gi, '-').toLowerCase()}_${fmt.replace(':', 'x')}.mp4`;
      const finalPath = path.join(dir, finalName);
      await concat(dir, [intro, main, outro], finalPath);
      outputs.push({ format: fmt, url: `/uploads/hacoeur/${job._id}/${finalName}`, width: W, height: H });
      done++;
    }
    job.outputs = outputs; job.status = 'done'; await setp(100, 'Terminé');
  } catch (e) {
    job.status = 'error'; job.error = (e && e.message ? e.message : String(e)).slice(0, 800); job.step = 'Erreur';
    await job.save();
  }
}
