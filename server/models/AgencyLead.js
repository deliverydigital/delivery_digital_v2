/**
 * Lead / client d'une agence partenaire (1 lead = 1 client). Cree par l'agence,
 * sert de base au montage du dossier OPCO. @author Rabah Ziane - 2026-06-02
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;
const schema = new Schema({
  agencyId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  agencyName: String,
  commercialId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  commercialName: String,
  email: { type: String, lowercase: true, trim: true },
  denom: { type: String, trim: true },
  siret: { type: String, trim: true },
  opco: { type: String, trim: true },
  addr: { type: String, trim: true }, // adresse établissement (détectée au SIRET) - pour le tampon convention
  // Suivi / rappel : ce qu'on attend (ex. "courrier AKTO") + date de rappel (notification agence).
  waitingNote: { type: String, trim: true },
  reminderAt: { type: Date },
  status: { type: String, enum: ['new', 'verified', 'dossier', 'converted', 'lost'], default: 'new', index: true },
  notes: String,
  hidden: { type: Boolean, default: false }, // suppression douce (masqué de la liste)
}, { timestamps: true });
export default mongoose.models.AgencyLead || mongoose.model('AgencyLead', schema);
