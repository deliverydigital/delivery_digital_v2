import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Schema } = mongoose;

// User schema
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password_hash: {
    type: String,
    required: true
  },
  // Copie chiffree (AES) du mot de passe en clair des comptes AGENCE, pour permettre au
  // superadmin de le RE-AFFICHER sans le changer ("Renvoyer accès"). select:false = jamais
  // renvoye sauf demande explicite. @author Rabah Ziane - 2026-06-06
  agencyPwEnc: {
    type: String,
    select: false
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  company: {
    type: String,
    trim: true,
    maxlength: 255
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  role: {
    type: String,
    enum: ['client', 'admin', 'project_manager', 'trainer', 'developer', 'agence', 'agence_commercial'],
    default: 'client'
  },
  // Commercial rattache a une agence (sous-compte). @author Rabah Ziane - 2026-06-02
  parentAgencyId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  // Cle API d'integration (comptes agence partenaire) - lecture seule via /api/agency/v1.
  // @author Rabah Ziane - 2026-06-02
  apiKey: { type: String, index: true },
  // Commission agence : gain = commissionFix (€) + commissionPercent % du montant HT du
  // dossier, versee a la reception du paiement OPCO. Standard : 120 € + 15%.
  commissionFix: { type: Number, default: 120 },
  commissionPercent: { type: Number, default: 15 },
  // Revente Pyemes : code de l'agence cote Pyemes (lien de parrainage ?ag=CODE). Sert a
  // rapatrier ses ventes/commissions Pyemes et son onboarding Stripe Connect. Regle par le
  // superadmin DD. @author Rabah Ziane - 2026-08-01
  pyemesCode: { type: String, uppercase: true, trim: true, index: true },
  // Avenant « Revente Pyemes » signe par l'agence (30% de la vente TTC). Le lien de vente et
  // l'activation Stripe ne se debloquent qu'apres signature. @author Rabah Ziane - 2026-08-01
  pyemesContract: {
    signed: { type: Boolean, default: false },
    signedBy: String, signedFunction: String, signedAt: Date, signedIp: String,
  },
  // Historique des argumentaires Pyemes envoyés aux clients (support de vente). `token` = jeton
  // opaque du lien tracké dans l'email ; `openedAt` = 1re ouverture du lien par le client (statut
  // « lien ouvert »). @author Rabah Ziane - 2026-08-01
  pyemesPitches: [{ to: String, template: String, at: Date, token: String, openedAt: Date, clientName: String, siret: String }],
  // Feuille de route Pyemes (avant mise en ligne) PARTAGEE entre Delivery Digital et l'agence :
  // chacun peut ajouter une tache a l'autre, cocher ce qui est fait, importer une checklist
  // (PDF/texte/CSV) et discuter dans le fil de messages. @author Rabah Ziane - 2026-08-31
  pyemesRoadmap: [{
    from: { type: String, enum: ['dd', 'agence'], default: 'dd' },  // qui a demande la tache
    titre: String,
    detail: String,
    // Structure d'une checklist de lancement : une action appartient a une PHASE, porte une
    // ECHEANCE, un RESPONSABLE et un CRITERE DE FAIT (ce qui prouve qu'elle est terminee). Sans ces
    // champs, 116 actions se lisaient comme une liste a plat impossible a piloter.
    // @author Rabah Ziane - 2026-09-01
    phase: String,                                                   // ex. "2 · Armement"
    echeance: String,                                                // ex. "J4 · 31/08"
    resp: { type: String, enum: ['PY', 'NG', 'MIX', ''], default: '' },
    critere: String,                                                 // « c'est fait quand… »
    ref: String,                                                     // renvoi au plan de croissance
    ordre: Number,                                                   // ordre d'origine dans le plan
    // « standby » = action volontairement mise en attente (on ne la fait pas maintenant, et ce
    // n'est pas un oubli). Elle sort du calcul d'avancement au lieu de plomber le compteur.
    // @author Rabah Ziane - 2026-09-01
    statut: { type: String, enum: ['a_faire', 'en_cours', 'fait', 'standby'], default: 'a_faire' },
    source: String,                                                  // 'manuel' ou 'import: <fichier>'
    // COMMENTAIRE LIBRE sur l action. Une feuille de route de 116 lignes se pilote a trois (Pyemes,
    // Nova, Delivery Digital) : sans un endroit ou ecrire « bloque tant que le compte Stripe n est
    // pas valide » ou « fait a moitie, reste la page tarifs », l information circule par messages et
    // se perd. Le commentaire est visible et modifiable des trois cotes, comme le reste de la liste.
    // @author Rabah Ziane - 2026-09-02
    commentaire: { type: String, default: '', maxlength: 2000 },
    commentaireAt: Date,
    commentairePar: String,                                          // qui a ecrit en dernier
    createdAt: { type: Date, default: Date.now },
    doneAt: Date,
  }],
  // IDENTIFIANTS DES COMPTES RESEAUX SOCIAUX (action #8 du plan). Pyemes cree les comptes, Nova les
  // anime : sans un endroit commun, les mots de passe circulent en clair par messagerie et personne
  // ne sait lequel est a jour. Le mot de passe est CHIFFRE en base (AES-256-GCM, cle derivee du
  // secret serveur) et n'est jamais renvoye tel quel : il faut le demander explicitement.
  // @author Rabah Ziane - 2026-09-01
  pyemesReseaux: [{
    reseau: String,             // linkedin, tiktok, instagram, x, facebook, youtube, autre
    compte: String,             // @pyemes, l'identifiant public
    identifiant: String,        // e-mail ou login de connexion
    secret: String,             // mot de passe CHIFFRE (iv:tag:donnees)
    note: String,               // double authentification, numero associe, remarques
    majPar: String,
    majLe: { type: Date, default: Date.now },
  }],
  // RETOURS CLIENTS de la fenetre de test (action #4 du plan de lancement). Chaque testeur remonte
  // ce qu'il a vecu, et les trois personnes du projet voient la MEME colonne : sans ca, les retours
  // se perdent en messages prives et personne ne sait ce qui a deja ete corrige.
  // @author Rabah Ziane - 2026-09-01
  pyemesRetours: [{
    from: { type: String, enum: ['dd', 'agence'], default: 'agence' },   // qui a saisi le retour
    auteur: String,                                                       // qui l'a saisi (nom)
    client: String,                                                       // de quel testeur il vient
    texte: String,                                                        // ce qu'il a dit
    gravite: { type: String, enum: ['bloquant', 'genant', 'idee'], default: 'genant' },
    statut: { type: String, enum: ['nouveau', 'en_cours', 'traite', 'ecarte'], default: 'nouveau' },
    reponse: String,                                                      // ce qui en a ete fait
    createdAt: { type: Date, default: Date.now },
    traiteLe: Date,
  }],
  // Publications reseaux sociaux proposees par l'agence : elle televerse la video, dit OU elle sera
  // publiee et avec quel texte ; Pyemes valide AVANT publication. Une video deposee = l'agence la
  // considere prete de son cote. @author Rabah Ziane - 2026-08-31
  pyemesSocials: [{
    fichier: String,                 // /uploads/agency-social/xxx.mp4
    nomFichier: String,              // nom d'origine, pour s'y retrouver
    taille: Number,
    reseaux: [String],               // instagram, tiktok, linkedin, facebook, youtube, x
    comptes: [String],               // comptes de publication reperes au @ (ex. @pyemes, @nova.agency)
    datePrevue: Date,                // publication prevue le...
    texte: String,                   // legende / contenu de la publication
    statut: { type: String, enum: ['a_valider', 'validee', 'a_revoir', 'publiee'], default: 'a_valider' },
    retour: String,                  // commentaire de Pyemes quand c'est a revoir
    decidePar: String,               // qui a tranche (Pyemes / Delivery Digital)
    decideLe: Date,
    createdAt: { type: Date, default: Date.now },
  }],
  pyemesMessages: [{
    from: { type: String, enum: ['dd', 'agence'], default: 'dd' },
    auteur: String,
    texte: String,
    image: String,                                                   // capture jointe (/uploads/...)
    at: { type: Date, default: Date.now },
  }],
  // Coordonnees bancaires de l'agence (pour verser les commissions).
  // iban/bic conserves pour compat FR/SEPA ; bankCountry + bankData gerent les
  // autres pays (les champs s'adaptent au pays cote UI). @author Rabah Ziane - 2026-06-02
  iban: { type: String, trim: true },
  bic: { type: String, trim: true },
  accountHolder: { type: String, trim: true },
  bankCountry: { type: String, default: 'FR' },
  bankData: { type: Schema.Types.Mixed, default: {} }, // champs RIB specifiques au pays
  ribPdfUrl: { type: String, trim: true },             // PDF du RIB (obligatoire pour valider le compte)
  bankValidated: { type: Boolean, default: false },    // compte bancaire valide par le superadmin DD
  // Infos entreprise de l'agence (bandeau a renseigner, a valider cote superadmin).
  companyInfo: {
    legalName: String, regNumber: String, vatNumber: String,
    address: String, city: String, postalCode: String, country: String,
    repName: String, repFunction: String,
  },
  // Signature du contrat de partenariat (validee ensuite cote superadmin).
  contract: {
    signed: { type: Boolean, default: false },
    signedBy: String, signedFunction: String, signedIp: String, signedAt: Date,
    validated: { type: Boolean, default: false },
  },
  // True quand le superadmin a valide infos entreprise + RIB + contrat.
  onboardingValidated: { type: Boolean, default: false },
  // === Champs FORMATEUR (role 'trainer') === @author Rabah Ziane - 2026-06-06
  hourlyRate: { type: Number, default: 0 },
  /**
   * Salle de visioconférence PERMANENTE du formateur : deliverydigital.fr/visio/<slug>,
   * le slug reprend son nom (ex. 'nicolas-goralski') pour valoriser l'intervenant auprès
   * des apprenants. Le lien ne change jamais, il se partage une fois pour toutes.
   * `visioHostKey` reste privée : elle seule donne le droit d'admettre les participants
   * qui patientent en salle d'attente (lien /visio/<slug>?h=<clé>, jamais diffusé).
   * @author Rabah Ziane - 2026-07-20
   */
  visioRoomSlug: { type: String, index: true },
  visioHostKey: { type: String },
  trainerSkills: { type: [String], default: [] },
  // Disponibilités RÉCURRENTES du formateur : jours de semaine travaillés (0=dim ... 6=sam) +
  // créneaux horaires d'1h. Sert à générer les sessions assignables. @author Rabah Ziane - 2026-06-19
  recurringAvailability: {
    days: { type: [Number], default: [] }, // 1=lun ... 6=sam
    slots: { type: [{ from: String, to: String }], default: [] }, // ex. [{from:'16:00',to:'17:00'}]
  },
  // Préférences de rappel configurables par le formateur. @author Rabah Ziane - 2026-06-07
  reminderPrefs: {
    course48: { type: Boolean, default: true },
    course24: { type: Boolean, default: true },
    course1: { type: Boolean, default: true },
    weeklyAvailability: { type: Boolean, default: true },
    weeklyDay: { type: Number, default: 5 },
    weeklyHour: { type: Number, default: 10 },
    weeklyLastSent: { type: Date },
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'active'
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  email_verification_token: String,
  password_reset_token: String,
  password_reset_expires: Date,
  last_login: Date,
  
  // Client-specific fields (embedded document approach)
  client_info: {
    company_size: {
      type: String,
      enum: ['small', 'medium', 'large', 'enterprise']
    },
    industry: String,
    website: String,
    address: String,
    city: String,
    postal_code: String,
    country: {
      type: String,
      default: 'France'
    },
    vat_number: String,
    siret: String,
    billing_address: String,
    billing_city: String,
    billing_postal_code: String,
    billing_country: {
      type: String,
      default: 'France'
    },
    preferred_language: {
      type: String,
      default: 'fr'
    },
    communication_preferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      phone: { type: Boolean, default: true }
    },
    notes: String
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { 
    transform: function(doc, ret) {
      // Remove sensitive fields when converting to JSON
      delete ret.password_hash;
      delete ret.password_reset_token;
      delete ret.email_verification_token;
      return ret;
    }
  }
});

// Indexes for better performance
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'client_info.company': 1 });

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.password_reset_token = resetToken;
  this.password_reset_expires = Date.now() + 3600000; // 1 hour
  return resetToken;
};

// Static methods
userSchema.statics.hashPassword = async function(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ status: 'active' });
};

userSchema.statics.findByRole = function(role) {
  return this.find({ role });
};

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password_hash')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password_hash, 12);
    this.password_hash = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Create and export the model
const User = mongoose.model('User', userSchema);

export default User;