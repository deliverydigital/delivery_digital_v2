/**
 * Demande de signature de convention a distance : l'agence/le commercial envoie au
 * client un lien securise ; le client lit la convention et la signe au doigt sur son
 * telephone. A la signature, le dossier OPCO est cree (transmis a Delivery Digital)
 * avec la signature du client. @author Rabah Ziane - 2026-06-04
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

const salarySchema = new Schema({
  firstname: String, lastname: String, email: String, poste: String,
  type_contrat: String, date_naissance: String, num_secu: String, telephone: String,
}, { _id: false });

const schema = new Schema({
  token: { type: String, index: true },
  // agencyId optionnel : un dossier monté directement par Delivery Digital (DDN) peut n'avoir
  // aucune agence rattachée. @Rabah 2026-06-21
  agencyId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  agencyName: String,
  mountedByAdmin: { type: Boolean, default: false }, // dossier monté depuis l'espace DDN (super admin)
  commercialId: { type: Schema.Types.ObjectId, ref: 'User' },
  commercialName: String,
  leadId: { type: Schema.Types.ObjectId, ref: 'AgencyLead' },
  editDossierId: { type: Schema.Types.ObjectId, ref: 'AgencyDossier' }, // correction : mettre a jour ce dossier au lieu d'en creer un
  denom: String, siret: String, opco: String, addr: String, clientEmail: String,
  managerEmail: String, // email du gérant signataire (destinataire réel du lien si renseigné). @Rabah 2026-06-18
  formationTitle: String, sessionName: String,
  sessionStart: Date, sessionEnd: Date,
  salaries: { type: [salarySchema], default: [] },
  amountHT: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'signed', 'cancelled'], default: 'pending', index: true },
  // Renseignes a la signature par le client.
  signedBy: String, signedFunction: String, signatureDataUrl: String, signedIp: String, signedAt: Date,
  dossierId: { type: Schema.Types.ObjectId, ref: 'AgencyDossier' },
  expiresAt: Date,
}, { timestamps: true });

export default mongoose.models.ConventionSignRequest || mongoose.model('ConventionSignRequest', schema);
