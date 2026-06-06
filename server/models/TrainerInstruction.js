/**
 * Bloc d'instruction affiché dans la rubrique "Instructions" de l'espace formateur :
 * ce que le formateur doit faire quand un cours est prévu (créer le groupe WhatsApp avec
 * les apprenants + le responsable pédagogique, etc.). Editable par le superadmin pour
 * pouvoir ajouter d'autres actions plus tard sans toucher au code.
 * @author Rabah Ziane · 2026-06-06
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;
const schema = new Schema({
  order: { type: Number, default: 0, index: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },     // texte (sauts de ligne conservés)
  icon: { type: String, default: 'check' }, // clé d'icône lucide côté UI
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.models.TrainerInstruction || mongoose.model('TrainerInstruction', schema);
