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
// Tâche collaborative sur le suivi du dossier : l'agence ou DDN s'attribue une action à une étape,
// commente, et coche "fait". Visible et modifiable des deux côtés. @author Rabah Ziane - 2026-07-02
const taskSchema = new Schema({
  step: { type: String, default: 'transmis' },          // clé d'étape du suivi
  label: String,                                         // intitulé de la tâche
  assignedTo: { type: String, enum: ['agence', 'ddn'], default: 'agence' }, // responsable
  comment: String,
  done: { type: Boolean, default: false },
  doneBy: String,                                        // 'agence' | 'ddn'
  doneAt: Date,
  createdBy: String,                                     // 'agence' | 'ddn'
  intervenantName: String,   // intervenant tagué sur la tâche
  intervenantEmail: String,  // email de l'intervenant notifié
}, { timestamps: true });
const schema = new Schema({
  // agencyId optionnel : dossier monté directement par Delivery Digital (DDN), sans agence. @Rabah 2026-06-21
  agencyId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  agencyName: String,
  mountedByAdmin: { type: Boolean, default: false }, // monté depuis l'espace DDN (super admin) au lieu d'une agence
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
  amountHT: { type: Number, default: 0 }, // montant HT ESTIMÉ du dossier (525 € x stagiaires)
  // Montant réellement ATTRIBUÉ / financé par l'OPCO (renseigné par l'admin une fois connu). Tant
  // qu'il vaut 0, la commission se calcule sur l'estimé (amountHT) ; dès qu'il est saisi, le % se
  // base dessus (montant réel). @author Rabah Ziane - 2026-07-29
  amountOpco: { type: Number, default: 0 },
  // Formateur affiché sur la convention (modifiable par le superadmin). Défaut : Ziane Rabah.
  // @author Rabah Ziane - 2026-07-17
  trainerName: { type: String, trim: true, maxlength: 120 },
  trainerEmail: { type: String, trim: true, maxlength: 160 },
  // Pipeline jusqu'au paiement (mis a jour par l'admin DD au fil du dossier OPCO)
  status: { type: String, enum: ['transmitted', 'instruction', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid', 'rejected'], default: 'transmitted', index: true },
  // Encaissement de la commission agence : l'admin DD marque opcoPaid quand l'OPCO a reglé
  // (-> fonds disponibles cote agence) ; l'agence envoie un ordre d'encaissement (+ sa facture) ;
  // l'admin fait le virement et passe le statut a 'paid'. @author Rabah Ziane - 2026-06-02
  opcoPaid: { type: Boolean, default: false },
  opcoPaidAt: Date,
  encashRequestedAt: Date,
  invoiceNumber: String,
  // Étape "Montage OPCO" (entre Accès OPCO et l'instruction) : Delivery Digital fait le
  // rattachement OPCO (ex. AKTO) du client -> courrier d'activation envoyé au client ; et/ou le
  // dossier attend le CSV des salariés pour être déposé. Visible dans le suivi côté agence ET
  // super admin (l'agence en lecture seule). @author Rabah Ziane - 2026-06-24
  aktoAttached: { type: Boolean, default: false }, // rattachement OPCO fait par DD (courrier d'activation envoyé)
  aktoAttachedAt: Date,
  rattachEmailSentAt: Date, // date d'envoi de l'email de confirmation de rattachement (client + agence)
  rdvAt: Date,                 // date du rendez-vous de finalisation du dossier (confirmé au client par email)
  confirmationEmailSentAt: Date, // date d'envoi de l'email de confirmation (déroulé + RDV) au client
  salariesPending: { type: Boolean, default: false }, // en attente du CSV des salariés pour monter le dossier OPCO
  hidden: { type: Boolean, default: false }, // suppression douce (masqué de la liste)
  // Brouillon : dossier enregistré incomplet depuis le wizard (bouton "Enregistrer") avant d'être
  // finalisé/transmis. Visible côté DD dans "Dossiers OPCO reçus" mais non notifié et non compté
  // comme "à traiter". Passe à false quand l'agence le transmet réellement. @author Rabah Ziane - 2026-07-02
  draft: { type: Boolean, default: false },
  // Tâches collaboratives agence <-> DDN sur le suivi (par étape). @author Rabah Ziane - 2026-07-02
  tasks: { type: [taskSchema], default: [] },
  // Ordres de paiement : versements/avances de commission enregistrés par l'admin, SANS toucher au
  // contrat. La commission (fixe 120 € + 15 %) reste calculée comme avant ; ici on trace ce qui a
  // été effectivement versé, part par part. Le % n'est normalement dû qu'au paiement OPCO, mais on
  // peut avancer le fixe, le %, ou les deux : chaque versement anticipé est marqué `avance`.
  // @author Rabah Ziane - 2026-07-29
  paymentOrders: { type: [new Schema({
    part: { type: String, enum: ['fixe', 'pourcentage'], required: true }, // part de commission versée
    montant: { type: Number, default: 0 },        // montant versé (€)
    avance: { type: Boolean, default: false },    // true = versé avant le paiement OPCO
    note: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: String, default: 'ddn' },
  }, { timestamps: true })], default: [] },
}, { timestamps: true });
export default mongoose.models.AgencyDossier || mongoose.model('AgencyDossier', schema);
