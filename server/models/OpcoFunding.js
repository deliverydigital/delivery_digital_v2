/**
 * Suivi du financement OPCO d'un dossier de formation (relié à un AgencyDossier existant,
 * sans modifier ce dernier). Montants demandé / accordé / perçu, échéances, statut et
 * justificatifs (accord de prise en charge, facture OPCO, virement...).
 * @author Rabah Ziane · 2026-06-07
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

const proofSchema = new Schema({
  title: String, filePath: String, originalName: String, size: Number,
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const schema = new Schema({
  dossierId: { type: Schema.Types.ObjectId, ref: 'AgencyDossier', unique: true, index: true, required: true },
  requestedAmount: { type: Number, default: 0 },
  grantedAmount: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  requestRef: String,        // n° de dossier / accord de prise en charge OPCO
  decisionDate: Date,        // date d'accord de prise en charge
  dueDate: Date,             // échéance de paiement attendue
  paidDate: Date,            // date de versement effectif
  status: { type: String, enum: ['a_demander', 'demande', 'accepte', 'refuse', 'paye'], default: 'a_demander' },
  notes: String,
  proofs: { type: [proofSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.OpcoFunding || mongoose.model('OpcoFunding', schema);
