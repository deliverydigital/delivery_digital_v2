/**
 * Cours / session de formation assignée à un FORMATEUR.
 * Deux origines (source) :
 *   - 'opco'   : rattaché à un dossier OPCO existant (AgencyDossier) -> réutilise
 *                client + apprenants + dates + formation (zéro double saisie).
 *   - 'manual' : créé à la main par le superadmin (cas hors OPCO).
 * Cycle de vie -> ENCAISSEMENT (même principe qu'agence) :
 *   scheduled -> (admin marque "réalisée") done/payable -> (formateur "Encaisser")
 *   encashRequested -> (admin vire + marque payé) paid.
 * Le montant à payer = heures de la formation × taux horaire négocié du formateur,
 * figé (snapshot) au moment où la session est marquée réalisée.
 * @author Rabah Ziane · 2026-06-06
 */
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Apprenant du groupe (sert aussi à constituer le groupe WhatsApp côté formateur).
const learnerSchema = new Schema({
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
}, { _id: false });

const schema = new Schema({
  trainerId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  trainerName: String,
  source: { type: String, enum: ['opco', 'manual'], default: 'manual', index: true },
  dossierId: { type: Schema.Types.ObjectId, ref: 'AgencyDossier', index: true }, // si source='opco'

  // Formation / contenu
  formationKey: String,        // program_id du catalogue (TrainingProgram)
  formationTitle: String,
  hours: { type: Number, default: 0 }, // durée (h) -> base du calcul de paie

  // Client + lieu
  clientName: String,          // denom du bénéficiaire
  clientEmail: String,
  /**
   * Interlocuteur chez le client : le formateur le contacte avant la formation pour confirmer
   * ou adapter les dates. S'il les adapte, il replanifie depuis son espace et Delivery Digital
   * reçoit un email (voir `reschedules`).
   * @author Rabah Ziane · 2026-07-20
   */
  clientContactName: String,
  clientPhone: String,
  location: String,            // présentiel / visio
  addr: String,

  // Planning
  sessionStart: Date,
  sessionEnd: Date,

  /**
   * Découpage réel du cours en journées/créneaux, calé sur les disponibilités du formateur.
   * Une formation de 21h se donne rarement d'un bloc : ex. 1 h de visio + 6 h en situation
   * de travail par jour sur 3 jours -> on ne réserve que la ou les heures encadrées.
   * sessionStart/sessionEnd restent renseignés (début du 1er créneau / fin du dernier) pour
   * l'affichage calendrier et les rappels existants.
   * @author Rabah Ziane · 2026-07-20
   */
  days: {
    type: [new Schema({
      date: { type: String, required: true },   // 'YYYY-MM-DD'
      from: { type: String, default: '09:00' }, // 'HH:MM'
      to: { type: String, default: '10:00' },
      mode: { type: String, enum: ['visio', 'presentiel', 'afest'], default: 'visio' },
      label: String,
      // Exercices en situation de travail à envoyer dans le groupe WhatsApp après la visio
      // de cette journée. Pré-remplis depuis le catalogue de la formation. @Rabah 2026-07-20
      exercises: String,
    }, { _id: false })],
    default: [],
  },
  // Heures encadrées réellement réservées (somme des créneaux) vs `hours` = durée pédagogique
  // totale de la formation (AFEST comprise), qui sert de base à la paie.
  scheduledHours: { type: Number, default: 0 },

  /**
   * Auto-évaluation de la formation PAR LE FORMATEUR, remplie à la fin du cours. Conservée
   * ici (et pas seulement dans un questionnaire externe) : c'est une preuve d'exécution
   * Qualiopi rattachée à la session, et elle conditionne la validation de la dernière étape.
   * @author Rabah Ziane · 2026-07-20
   */
  // Le formateur a terminé son déroulé (dernière étape validée) : Delivery Digital est
  // prévenu et n'a plus qu'à marquer le cours réalisé pour libérer les fonds. @Rabah 2026-07-20
  trainerCompletedAt: Date,
  selfAssessment: {
    at: Date,
    objectivesMet: String,      // oui / partiellement / non
    groupLevel: String,         // homogène / hétérogène / faible / bon
    attendance: String,         // assiduité constatée
    difficulties: String,
    improvements: String,
    rating: Number,             // note globale sur 5
  },

  /**
   * Avancement du formateur dans le déroulé (rubrique Instructions) POUR CE COURS : chaque
   * étape validée est horodatée. Suivi par cours et non par formateur, car le déroulé se
   * rejoue à chaque nouvelle session (nouveau groupe WhatsApp, nouveau client...).
   * @author Rabah Ziane · 2026-07-20
   */
  stepsDone: {
    type: [new Schema({ instructionId: String, at: { type: Date, default: Date.now } }, { _id: false })],
    default: [],
  },

  // Historique des replanifications faites par le formateur après échange avec le client.
  // Chaque entrée déclenche un email d'information à Delivery Digital. @Rabah 2026-07-20
  reschedules: {
    type: [new Schema({
      at: { type: Date, default: Date.now },
      by: String,                 // nom du formateur
      reason: String,             // motif donné par le formateur / le client
      before: { type: Array, default: [] },
      after: { type: Array, default: [] },
    }, { _id: false })],
    default: [],
  },

  /**
   * Salle de visioconférence du cours : le formateur partage ce lien dans le groupe WhatsApp
   * avec son message d'accueil, et y partage son écran le jour J. Généré automatiquement
   * (salle Delivery Digital, sans compte ni installation) si l'admin n'en fournit pas un (Meet, Zoom...).
   * @author Rabah Ziane · 2026-07-20
   */
  meetingLink: String,
  meetingProvider: { type: String, default: '' }, // 'dd' = salle Delivery Digital, sinon lien externe
  // Identifiant de la salle DD (imprévisible) -> https://deliverydigital.fr/visio/<roomId>
  // Le lien est PERMANENT : il ne change pas d'une session à l'autre, le formateur peut le
  // partager une fois pour toutes dans le groupe WhatsApp.
  roomId: { type: String, index: true },
  // Clé d'animateur : seul le formateur l'a (lien /visio/<roomId>?h=<hostKey>, jamais partagé
  // aux apprenants). Elle donne le droit d'admettre les participants en salle d'attente.
  hostKey: { type: String },

  // Groupe d'apprenants + organisation pédagogique
  learners: { type: [learnerSchema], default: [] },
  pedagoName: String,          // responsable pédagogique (à ajouter au groupe WhatsApp)
  pedagoPhone: String,
  whatsappGroupCreated: { type: Boolean, default: false },
  whatsappGroupLink: String,
  whatsappCreatedAt: Date,

  // Paie / encaissement
  hourlyRate: { type: Number, default: 0 },  // taux figé au moment du "réalisée"
  payAmount: { type: Number, default: 0 },   // heures × taux (ou montant fixe admin)
  status: { type: String, enum: ['scheduled', 'done', 'encashRequested', 'paid', 'cancelled'], default: 'scheduled', index: true },
  doneAt: Date,                // marqué réalisée (= fonds disponibles)
  encashRequestedAt: Date,     // formateur a demandé l'encaissement
  paidAt: Date,
  invoiceNumber: String,       // TRF-YYYY-XXXXX
  /**
   * Bon de commande émis par Delivery Digital vers le formateur à l'assignation du cours :
   * il matérialise la commande de prestation (heures encadrées × taux) en application du
   * contrat-cadre signé. Numéroté BC-YYYY-XXXXX. @author Rabah Ziane · 2026-07-20
   */
  purchaseOrder: {
    number: String,
    issuedAt: Date,
  },

  // Notifications / rappels
  assignedNotifiedAt: Date,    // email "nouveau cours" envoyé au formateur
  reminderSentAt: Date,        // (legacy) dernier rappel envoyé
  // Rappels automatiques avant le cours (un seul envoi par palier). @Rabah 2026-06-07
  reminders: {
    h48: { type: Boolean, default: false },
    h24: { type: Boolean, default: false },
    h1: { type: Boolean, default: false },
  },

  notes: String,
}, { timestamps: true });

schema.index({ trainerId: 1, sessionStart: 1 });

export default mongoose.models.TrainerSession || mongoose.model('TrainerSession', schema);
