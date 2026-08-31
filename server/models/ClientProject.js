/**
 * Espace client (suivi de projet). Un projet = un client (ex. HipeKids) avec sa liste
 * de tâches suivies. Le client consulte l'avancement via /espace-client + code d'accès
 * (lecture seule). L'admin DD gère projets + tâches. @author Rabah Ziane - 2026-08-05
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

const taskSchema = new Schema({
  code: String,                 // ex. AA-BE-0201
  section: String,              // ex. "A · SOCLE BACKEND CENTRAL…"
  title: String,
  story: String,                // besoin utilisateur
  area: String,                 // zone impactée (PA/SH…)
  priority: { type: Number, default: 3 },   // 1..5
  category: String,             // Nouvelle fonctionnalité, Bug…
  status: { type: String, enum: ['todo', 'in_progress', 'done', 'built'], default: 'todo' },
  // Étape d'avancement quand status = in_progress : discussion -> coding -> testing -> ready.
  // Alimente la barre de progression côté client. @Rabah 2026-08-10
  phase: { type: String, enum: ['discussion', 'coding', 'testing', 'ready'], default: 'discussion' },
  estimate: String,             // "4 j"
  dependsOn: String,
  note: String,                 // note interne DD (non affichée au client)
  // Choix du client : tache ECARTEE (« a ne pas faire ») => sortie du forfait/decompte, grisee.
  // Par defaut false = retenue (« a faire »). @author Rabah Ziane · 2026-08-13
  ecartee: { type: Boolean, default: false },
}, { _id: false });

const schema = new Schema({
  name: { type: String, required: true },           // "HiPe Kids"
  slug: { type: String, required: true, unique: true, index: true }, // "hipekids"
  accessCode: { type: String, required: true, index: true },         // code de suivi (unique en pratique)
  contactEmail: String,
  logoUrl: String,                                  // logo du client (animé côté espace) - ex. /client-logos/hipekids.png
  summary: String,                                  // sous-titre affiché au client
  // Versions du chantier (la courante + les précédentes déjà livrées), pour le menu déroulant de
  // l'espace client. label ex. "v6.0.0", "Version 28 oct. 2025". @Rabah 2026-08-10
  versions: { type: [{ label: String, current: Boolean }], default: [] },
  // Actions demandées AU CLIENT : DD écrit une consigne, elle s'affiche sur le tableau de bord du
  // client (option envoi par email) ; le client confirme quand c'est fait. @Rabah 2026-08-10
  clientRequests: {
    type: [{
      from: { type: String, default: 'dd' },           // 'dd' (DD -> client) | 'client' (client -> DD)
      title: String,
      instruction: String,
      status: { type: String, default: 'pending' },   // 'pending' | 'done'
      createdAt: { type: Date, default: Date.now },
      doneAt: Date,
      emailedAt: Date,
      // Fil de discussion sous la tâche : commentaires + captures d'écran (DD et client).
      comments: {
        type: [{ author: { type: String, default: 'dd' }, text: String, image: String, createdAt: { type: Date, default: Date.now } }],
        default: [],
      },
    }],
    default: [],
  },
  unit: { type: String, default: 'j' },             // unité d'estimation
  availableDays: { type: Number, default: 0 },      // forfait acheté par le client (jours disponibles)
  forfaitStart: Date,                               // date de démarrage du forfait (« à partir de maintenant »)
  // Travaux realises EN PLUS des taches demandees par le client (correctifs, incidents,
  // finitions non prevues) : tracabilite + valorisation, hors decompte du forfait.
  // @author Rabah Ziane - 2026-08-31
  extras: {
    type: [{
      date: { type: Date, default: Date.now },
      title: String,
      detail: String,
      area: String,                                 // zone concernee (ex. "Espace parent")
      // 'extra' = travail ponctuel hors demande ; 'maintenance' = exploitation courante
      // (environnement de test, deploiements, surveillance serveur, outils internes).
      kind: { type: String, enum: ['extra', 'maintenance'], default: 'extra' },
    }],
    default: [],
  },
  clientOrder: { type: [String], default: [] },     // ordre des tâches défini par le client (glisser-déposer)
  linkSends: { type: [{ email: String, at: Date }], default: [] }, // historique des envois du lien par email
  stagingUrl: String,                               // lien environnement de test (aperçu client)
  prodUrl: String,                                  // lien environnement de production (aperçu client)
  active: { type: Boolean, default: true },
  tasks: { type: [taskSchema], default: [] },
  lastViewedAt: Date,                               // dernière consultation par le client
}, { timestamps: true });

export default mongoose.models.ClientProject || mongoose.model('ClientProject', schema);
