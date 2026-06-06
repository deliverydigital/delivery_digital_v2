/**
 * Job de génération de vidéo tutoriel "Hacœur" (générateur semi-automatique).
 * Pipeline : voix off ElevenLabs (avec timestamps -> sous-titres synchronisés, sans
 * OpenAI) + assemblage FFmpeg (intro + capture + voix + sous-titres + outro) en MP4
 * 1080p aux formats demandés. Suivi de statut/progression. @author Rabah Ziane - 2026-06-05
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

const outputSchema = new Schema({ format: String, url: String, width: Number, height: Number }, { _id: false });

const schema = new Schema({
  metier: { type: String, trim: true },           // "Métier du jour" (ex. coiffeur)
  prompt: { type: String },                       // idée libre -> script généré (Claude)
  script: { type: String },                       // narration
  formats: { type: [String], default: ['16:9'] }, // '16:9' (YouTube), '9:16' (Shorts)
  sourceVideo: { type: String },                  // chemin de la capture uploadée (optionnel)
  engine: { type: String, enum: ['edge', 'elevenlabs'], default: 'edge' }, // voix gratuite / payante
  voiceId: { type: String },                      // voix (id ElevenLabs ou nom Edge fr-FR-*)
  status: { type: String, enum: ['queued', 'processing', 'done', 'error'], default: 'queued', index: true },
  step: { type: String, default: 'En file d’attente' },
  progress: { type: Number, default: 0 },         // 0-100
  error: { type: String },
  audioUrl: { type: String },                     // voix off générée
  audioDuration: { type: Number },                // secondes
  outputs: { type: [outputSchema], default: [] }, // MP4 par format
}, { timestamps: true });

export default mongoose.models.VideoJob || mongoose.model('VideoJob', schema);
