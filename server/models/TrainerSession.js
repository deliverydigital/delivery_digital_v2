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
  location: String,            // présentiel / visio
  addr: String,

  // Planning
  sessionStart: Date,
  sessionEnd: Date,

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
