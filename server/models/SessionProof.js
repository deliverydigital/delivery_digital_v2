/**
 * Preuve d'exécution d'une formation (par session, et éventuellement par apprenant) :
 * programme signé, convention, feuille d'émargement, attestation, évaluations, certificat...
 * Sert au suivi strict pour les audits Qualiopi. Rattachée à une TrainerSession (et au
 * dossier OPCO d'origine le cas échéant). @author Rabah Ziane · 2026-06-07
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

const schema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'TrainerSession', index: true },
  dossierId: { type: Schema.Types.ObjectId, ref: 'AgencyDossier', index: true },
  // Type de preuve (liste contrôlée côté UI).
  docType: { type: String, default: 'autre' },
  title: String,
  learnerName: String, // si la preuve concerne un apprenant précis (attestation, certificat...)
  filePath: String,
  originalName: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.SessionProof || mongoose.model('SessionProof', schema);
