/**
 * Tracker de backlinks (liens externes pointant vers deliverydigital.fr).
 *
 * @author Rabah Ziane - 2026-05-17
 */
import mongoose from 'mongoose';

const BacklinkSchema = new mongoose.Schema({
  sourceUrl:    { type: String, required: true, unique: true, index: true }, // URL où se trouve le lien
  sourceDomain: { type: String, default: '' },
  targetUrl:    { type: String, default: 'https://deliverydigital.fr/' },
  anchor:       { type: String, default: '' }, // texte du lien
  da:           { type: Number, default: null }, // Domain Authority estimée 1-100
  type:         { type: String, enum: ['directory', 'guest-post', 'partner', 'press', 'forum', 'social', 'profile', 'review', 'other'], default: 'other' },
  status:       { type: String, enum: ['planned', 'submitted', 'live', 'lost', 'rejected'], default: 'planned' },
  dateAcquired: { type: Date, default: null },
  notes:        { type: String, default: '' },
  active:       { type: Boolean, default: true },
}, { timestamps: true });

BacklinkSchema.index({ status: 1, dateAcquired: -1 });
BacklinkSchema.index({ type: 1, status: 1 });

export default mongoose.models.Backlink || mongoose.model('Backlink', BacklinkSchema);
