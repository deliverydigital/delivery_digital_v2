/**
 * Jours d'indisponibilite des sessions de formation, posés par le superadmin.
 * Un jour bloqué (YYYY-MM-DD) retire du wizard toute session de 3 jours qui le contient.
 * @author Rabah Ziane - 2026-06-04
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;
const schema = new Schema({
  day: { type: String, required: true, unique: true, index: true }, // 'YYYY-MM-DD'
  label: { type: String, default: '' },
}, { timestamps: true });
export default mongoose.models.FormationUnavailability || mongoose.model('FormationUnavailability', schema);
