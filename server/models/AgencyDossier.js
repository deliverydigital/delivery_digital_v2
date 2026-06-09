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
  sessionStart: Date, sessionEnd: Date, // début / fin de formation
  salaries: { type: [salarySchema], default: [] },
  signedBy: String, signedFunction: String, signedIp: String,
  signatureDataUrl: String, // image PNG de la signature manuscrite du client (au doigt)
  signedRemote: Boolean,     // true = signe a distance via lien, false/absent = en personne
  signedAt: Date,            // date de signature de la convention par le client
  amountHT: { type: Number, default: 0 }, // montant HT du dossier (525 € x stagiaires)
  // Pipeline jusqu'au paiement (mis a jour par l'admin DD au fil du dossier OPCO)
  status: { type: String, enum: ['transmitted', 'instruction', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid', 'rejected'], default: 'transmitted', index: true },
  // Encaissement de la commission agence : l'admin DD marque opcoPaid quand l'OPCO a reglé
  // (-> fonds disponibles cote agence) ; l'agence envoie un ordre d'encaissement (+ sa facture) ;
  // l'admin fait le virement et passe le statut a 'paid'. @author Rabah Ziane - 2026-06-02
  opcoPaid: { type: Boolean, default: false },
  opcoPaidAt: Date,
  encashRequestedAt: Date,
  invoiceNumber: String,
  hidden: { type: Boolean, default: false }, // suppression douce (masqué de la liste)
}, { timestamps: true });
export default mongoose.models.AgencyDossier || mongoose.model('AgencyDossier', schema);
