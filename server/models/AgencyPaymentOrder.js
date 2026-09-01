/**
 * Ordre de paiement (ordre de virement) généré par l'admin pour verser les commissions d'une
 * agence sur un ou plusieurs dossiers. Conserve le détail (par mois, montant estimé / attribué
 * OPCO, part fixe / %), le PDF généré et l'envoi (email + copie agence). Visible côté admin ET
 * côté agence (historique + PDF attaché). N'altère pas le contrat. @author Rabah Ziane - 2026-07-29
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

const lineSchema = new Schema({
  dossierId: { type: Schema.Types.ObjectId, ref: 'AgencyDossier' },
  denom: String,
  month: String,            // 'YYYY-MM' (mois de la session, sinon création)
  amountEstimated: Number,  // montant HT estimé
  amountOpco: Number,       // montant attribué par l'OPCO (0 si pas encore connu)
  commissionFix: Number,    // part fixe versée sur ce dossier (120 € ou 0)
  commissionPct: Number,    // part % (sur le montant OPCO sinon estimé)
  total: Number,            // commission totale du dossier
}, { _id: false });

const schema = new Schema({
  ref: { type: String, index: true },            // OP-2026-0001
  agencyId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  agencyName: String,
  agencyEmail: String,
  lines: { type: [lineSchema], default: [] },
  totalCommission: { type: Number, default: 0 },
  pdfPath: String,                                // uploads/payment-orders/OP-xxxx.pdf
  pdfUrl: String,                                 // /uploads/payment-orders/OP-xxxx.pdf
  sentTo: String,                                 // contact@deliverydigital.fr
  ccAgency: { type: Boolean, default: false },
  sentAt: Date,
  // L'admin confirme que le virement à l'agence a bien été effectué -> alimente les "Gains acquis".
  // @author Rabah Ziane - 2026-07-29
  paidAt: Date,
  createdByAdmin: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.AgencyPaymentOrder || mongoose.model('AgencyPaymentOrder', schema);
