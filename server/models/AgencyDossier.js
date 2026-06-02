/**
 * Dossier de formation OPCO monte par une agence pour un client, transmis a
 * Delivery Digital (recu cote admin). @author Rabah Ziane - 2026-06-02
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;
const salarySchema = new Schema({
  firstname: String, lastname: String, email: String, poste: String,
  type_contrat: String, date_naissance: String, num_secu: String, telephone: String,
}, { _id: false });
const schema = new Schema({
  agencyId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  agencyName: String,
  commercialId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  commercialName: String,
  leadId: { type: Schema.Types.ObjectId, ref: 'AgencyLead' },
  denom: String, siret: String, opco: String, addr: String, clientEmail: String,
  formationTitle: String, sessionName: String,
  salaries: { type: [salarySchema], default: [] },
  signedBy: String, signedFunction: String, signedIp: String,
  amountHT: { type: Number, default: 0 }, // montant HT du dossier (525 € x stagiaires)
  // Pipeline jusqu'au paiement (mis a jour par l'admin DD au fil du dossier OPCO)
  status: { type: String, enum: ['transmitted', 'instruction', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid', 'rejected'], default: 'transmitted', index: true },
}, { timestamps: true });
export default mongoose.models.AgencyDossier || mongoose.model('AgencyDossier', schema);
