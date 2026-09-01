/**
 * Certificat de formation vérifiable : alimente la page publique /api/verify/:token (preuve que la
 * formation a bien eu lieu, avec dates + apprenants présents) et les PDF envoyés au client
 * (attestation de réussite + vitrophanie « Restaurant engagé & formé »). Le QR des PDF pointe vers
 * cette page. @author Rabah Ziane - 2026-07-29
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema({
  token: { type: String, index: true, unique: true },   // identifiant public du QR / de la page
  dossierId: { type: Schema.Types.ObjectId, ref: 'AgencyDossier', index: true },
  denom: String,                 // établissement (restaurant)
  formationTitle: String,
  sessionStart: Date,
  sessionEnd: Date,
  city: String,
  trainerName: String,
  // Apprenants RÉELLEMENT présents (les absents sont désélectionnés avant envoi).
  trainees: { type: [{ firstname: String, lastname: String }], default: [] },
  clientEmail: String,
  attestationUrl: String,        // /uploads/attestations/xxx.pdf
  vitrophanieUrl: String,
  sentToClientAt: Date,
}, { timestamps: true });

export default mongoose.models.FormationCertificate || mongoose.model('FormationCertificate', schema);
