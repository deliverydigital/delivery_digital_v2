/**
 * Lead / client d'une agence partenaire (1 lead = 1 client). Cree par l'agence,
 * sert de base au montage du dossier OPCO. @author Rabah Ziane - 2026-06-02
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;
// Tâche collaborative (agence <-> DDN) portée par le CLIENT : dispo dès le lead, sans dossier OPCO.
// Même forme que AgencyDossier.tasks (sync via leadId côté admin). @author Rabah Ziane - 2026-07-02
const taskSchema = new Schema({
  step: { type: String, default: 'transmis' },
  label: String,
  assignedTo: { type: String, enum: ['agence', 'ddn'], default: 'agence' },
  comment: String,
  done: { type: Boolean, default: false },
  doneBy: String,
  doneAt: Date,
  createdBy: String,
  intervenantName: String,   // intervenant tagué sur la tâche
  intervenantEmail: String,  // email de l'intervenant notifié
}, { timestamps: true });
const schema = new Schema({
  agencyId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  agencyName: String,
  commercialId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  commercialName: String,
  email: { type: String, lowercase: true, trim: true },
  // Emails dédiés (optionnels) : comptable du client + gérant (signataire de la convention).
  // La convention de formation est envoyée au gérant si renseigné, sinon à l'email principal.
  // @author Rabah Ziane - 2026-06-18
  accountantEmail: { type: String, lowercase: true, trim: true },
  managerEmail: { type: String, lowercase: true, trim: true },
  denom: { type: String, trim: true },
  siret: { type: String, trim: true },
  opco: { type: String, trim: true },
  addr: { type: String, trim: true }, // adresse établissement (détectée au SIRET) - pour le tampon convention
  // Suivi / rappel : ce qu'on attend (ex. "courrier AKTO") + date de rappel (notification agence).
  waitingNote: { type: String, trim: true },
  reminderAt: { type: Date },
  // Suivi annuel : le client a-t-il deja fait une formation financee cette annee ?
  // Si non -> budget OPCO disponible a 100% pour l'annee en cours. @author Rabah Ziane - 2026-06-18
  formationDoneThisYear: { type: Boolean, default: false },
  // Nombre de salaries de l'ENTREPRISE cliente (distinct de dossier.salaries = stagiaires inscrits).
  companyEmployees: { type: Number },
  status: { type: String, enum: ['new', 'verified', 'dossier', 'converted', 'lost'], default: 'new', index: true },
  rdvAt: Date,                 // RDV de finalisation confirmé au client (email de confirmation, avant montage du dossier)
  confirmationEmailSentAt: Date, // date d'envoi de l'email de confirmation (déroulé + RDV) - même sans dossier
  notes: String,
  hidden: { type: Boolean, default: false }, // suppression douce (masqué de la liste)
  // Tâches collaboratives agence <-> DDN, disponibles dès le client (sans dossier). @Rabah 2026-07-02
  tasks: { type: [taskSchema], default: [] },
}, { timestamps: true });
export default mongoose.models.AgencyLead || mongoose.model('AgencyLead', schema);
