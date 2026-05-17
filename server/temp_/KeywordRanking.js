/**
 * Suivi position SERP pour un mot-cle donne.
 * Stocke notre position + top 10 concurrents + historique.
 *
 * @author Rabah Ziane - 2026-05-17
 */
import mongoose from 'mongoose';

const SerpResultSchema = new mongoose.Schema({
  position: { type: Number, required: true },
  domain: { type: String, required: true },
  url: { type: String, required: true },
  title: { type: String, default: '' },
  snippet: { type: String, default: '' },
  isUs: { type: Boolean, default: false },
}, { _id: false });

const HistoryPointSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  ourPosition: { type: Number, default: null }, // null = pas dans top 100
  totalResults: { type: Number, default: 0 },
}, { _id: false });

const KeywordRankingSchema = new mongoose.Schema({
  keyword:         { type: String, required: true, unique: true, index: true },
  market:          { type: String, default: 'fr', index: true }, // fr, sa, qa, ae...
  language:        { type: String, default: 'fr' },
  location:        { type: String, default: 'France' },
  ourDomain:       { type: String, default: 'deliverydigital.fr' },
  ourPosition:     { type: Number, default: null }, // dernier check
  bestPosition:    { type: Number, default: null }, // meilleure position jamais atteinte
  worstPosition:   { type: Number, default: null },
  lastChecked:     { type: Date, default: null },
  top10:           [SerpResultSchema],
  history:         [HistoryPointSchema], // 1 point par check, max 365 derniers
  source:          { type: String, default: 'manual' }, // manual | gsc | suggested
  notes:           { type: String, default: '' },
  active:          { type: Boolean, default: true },
}, { timestamps: true });

KeywordRankingSchema.index({ market: 1, ourPosition: 1 });

export default mongoose.models.KeywordRanking || mongoose.model('KeywordRanking', KeywordRankingSchema);
