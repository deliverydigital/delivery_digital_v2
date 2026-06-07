/**
 * Indisponibilités PERSONNELLES d'un formateur (un jour bloqué = YYYY-MM-DD).
 * Posées par le formateur depuis son espace pour qu'on ne lui assigne pas de cours
 * ces jours-là. Différent de FormationUnavailability (global, posé par le superadmin).
 * @author Rabah Ziane · 2026-06-06
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;
const schema = new Schema({
  trainerId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  day: { type: String, required: true }, // 'YYYY-MM-DD'
  // Granularité : journée entière / matin / après-midi / créneaux horaires précis.
  kind: { type: String, enum: ['full', 'am', 'pm', 'hours'], default: 'full' },
  hours: { type: [{ from: String, to: String }], default: [] }, // créneaux 'HH:MM' si kind='hours'
  label: { type: String, default: '' },
}, { timestamps: true });
schema.index({ trainerId: 1, day: 1 }, { unique: true });
export default mongoose.models.TrainerUnavailability || mongoose.model('TrainerUnavailability', schema);
