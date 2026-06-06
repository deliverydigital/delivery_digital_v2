/**
 * Générateur de vidéos "Hacœur" (superadmin via x-admin-secret).
 *   POST /api/admin/video-studio        - upload capture + crée un job, lance le pipeline
 *   GET  /api/admin/video-studio        - liste des jobs
 *   GET  /api/admin/video-studio/:id    - statut/progression d'un job
 *   GET  /api/admin/video-studio/config - voix par défaut / clé configurée (booléen)
 * @author Rabah Ziane - 2026-06-05
 */
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import VideoJob from '../models/VideoJob.js';
import { runVideoJob } from './videoPipeline.js';
import { DEFAULT_VOICE_ID, DEFAULT_ENGINE, EDGE_VOICE } from './videoBranding.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '../../uploads/hacoeur/sources');
fs.mkdirSync(SRC_DIR, { recursive: true });

const router = express.Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-admin-secret';
const requireAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SRC_DIR),
  filename: (req, file, cb) => cb(null, crypto.randomBytes(10).toString('hex') + path.extname(file.originalname || '.mp4')),
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500 Mo

router.get('/config', requireAdmin, (req, res) => {
  res.json({ ok: true, defaultEngine: DEFAULT_ENGINE, edgeVoice: EDGE_VOICE, hasElevenKey: !!process.env.ELEVENLABS_API_KEY, hasClaude: !!process.env.ANTHROPIC_API_KEY, defaultVoiceId: DEFAULT_VOICE_ID || '' });
});

// Génère un script de narration à partir d'un prompt (Claude - clé déjà configurée).
// Contenu ORIGINAL optimisé réseaux/monétisation. @author Rabah Ziane - 2026-06-05
router.post('/script', requireAdmin, async (req, res) => {
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(400).json({ ok: false, error: 'claude_key_missing' });
    const prompt = (req.body.prompt || '').trim();
    const metier = (req.body.metier || '').trim();
    if (!prompt && !metier) return res.status(400).json({ ok: false, error: 'prompt_required' });
    const sys = `Tu écris la narration (voix off) d'une courte vidéo verticale pour la marque "Hacœur" (ton hacker, captivant, malin). Contraintes : 100% ORIGINAL (monétisable sur YouTube/réseaux), français, accroche forte dès la 1re phrase, du concret/de la valeur, 130 à 180 mots (~45-70s), un appel à l'action final. Réponds UNIQUEMENT par le texte à lire, sans titre, sans markdown, sans didascalies.`;
    const user = `${metier ? `Métier/sujet : ${metier}\n` : ''}Idée / prompt : ${prompt || metier}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 700, system: sys, messages: [{ role: 'user', content: user }] }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(500).json({ ok: false, error: (j.error?.message || 'claude_error').slice(0, 200) });
    const script = (j.content || []).map((c) => c.text || '').join('').trim();
    res.json({ ok: true, script });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/', requireAdmin, async (req, res) => {
  const jobs = await VideoJob.find({}).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ ok: true, jobs });
});

router.get('/:id', requireAdmin, async (req, res) => {
  const job = await VideoJob.findById(req.params.id).lean();
  if (!job) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, job });
});

router.post('/', requireAdmin, upload.single('video'), async (req, res) => {
  try {
    const script = (req.body.script || '').trim();
    if (!script) return res.status(400).json({ ok: false, error: 'script_required' });
    let formats = req.body.formats;
    formats = Array.isArray(formats) ? formats : (typeof formats === 'string' && formats ? formats.split(',') : ['16:9']);
    formats = formats.filter((f) => ['16:9', '9:16'].includes(f));
    if (!formats.length) formats = ['16:9'];
    const engine = ['edge', 'elevenlabs'].includes(req.body.engine) ? req.body.engine : DEFAULT_ENGINE;
    const job = await VideoJob.create({
      metier: (req.body.metier || '').trim(),
      prompt: (req.body.prompt || '').trim(),
      script, formats, engine,
      sourceVideo: req.file ? `/uploads/hacoeur/sources/${req.file.filename}` : undefined, // capture optionnelle
      voiceId: (req.body.voiceId || '').trim() || (engine === 'elevenlabs' ? DEFAULT_VOICE_ID : ''),
      status: 'queued',
    });
    // Lancement du pipeline en arrière-plan (le suivi se fait via GET /:id).
    setImmediate(() => { runVideoJob(job._id).catch(() => {}); });
    res.json({ ok: true, jobId: job._id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

export default router;
