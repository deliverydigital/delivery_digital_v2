/**
 * Disponibilités DÉCLARÉES par le formateur (un jour = YYYY-MM-DD).
 *
 * Logique volontairement POSITIVE, à l'inverse de TrainerUnavailability : le formateur
 * indique les jours où il PEUT intervenir, et on ne lui assigne de cours que sur ces jours.
 * Un formateur qui n'a rien déclaré n'est donc pas assignable : c'est le comportement voulu,
 * il doit remplir son calendrier.
 * @author Rabah Ziane · 2026-07-20
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;
const schema = new Schema({
  trainerId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  day: { type: String, required: true },  // 'YYYY-MM-DD'
  // Granularité : journée entière / matin / après-midi / créneaux horaires précis.
  kind: { type: String, enum: ['full', 'am', 'pm', 'hours'], default: 'full' },
  hours: { type: [{ from: String, to: String }], default: [] }, // créneaux 'HH:MM' si kind='hours'
  label: { type: String, default: '' },
}, { timestamps: true });
schema.index({ trainerId: 1, day: 1 }, { unique: true });
export default mongoose.models.TrainerAvailability || mongoose.model('TrainerAvailability', schema);
