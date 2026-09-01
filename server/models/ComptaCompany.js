import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Une entreprise gérée dans le module Comptabilité (style Indy).
 * Porte le régime fiscal (IS / IR), le régime de TVA, l'exercice comptable,
 * la connexion Qonto (récupération auto des transactions) et le report
 * à nouveau (compta de l'année précédente, nécessaire pour la liasse).
 *
 * @author Rabah Ziane · 2026-07-07
 */
const comptaCompanySchema = new Schema({
  name:        { type: String, required: true, trim: true, maxlength: 200 },
  siren:       { type: String, trim: true, maxlength: 14 },
  // Identité légale complétée automatiquement depuis le SIREN/SIRET (API Sirene).
  siret:       { type: String, trim: true, maxlength: 20 },   // SIRET du siège
  tva_intra:   { type: String, trim: true, maxlength: 20 },   // n° TVA intracommunautaire
  code_ape:    { type: String, trim: true, maxlength: 10 },   // activité principale (NAF/APE)
  libelle_ape: { type: String, trim: true, maxlength: 200 },
  adresse:     { type: String, trim: true, maxlength: 300 },  // adresse du siège
  code_postal: { type: String, trim: true, maxlength: 10 },
  ville:       { type: String, trim: true, maxlength: 120 },
  date_creation:{ type: String, trim: true, maxlength: 20 },
  // Forme juridique -> conditionne la liasse (2065/2033 pour IS société,
  // 2031/2035 pour IR entreprise individuelle / BNC).
  forme:       { type: String, enum: ['EI', 'EURL', 'SARL', 'SAS', 'SASU', 'SCI', 'autre'], default: 'SAS' },

  // Régime d'imposition des bénéfices.
  regime_fiscal: { type: String, enum: ['IS', 'IR'], default: 'IS' },
  // Pour l'IR : nature des revenus -> détermine la liasse (BIC réel / BNC).
  categorie_ir: { type: String, enum: ['BIC', 'BNC', null], default: null },

  // Régime de TVA.
  regime_tva:  { type: String, enum: ['franchise', 'reel_simplifie', 'reel_normal'], default: 'reel_normal' },
  // Crédit de TVA reporté de l'exercice précédent (ligne 24 CA12).
  tva_credit_anterieur: { type: Number, default: 0 },
  // Déficits antérieurs reportables (IS) au 1er jour de l'exercice.
  deficit_reportable: { type: Number, default: 0 },
  // Crédit d'impôt recherche (info) - créance sur l'État.
  credit_impot_cir: { type: Number, default: 0 },

  // Exercice comptable.
  exercice: {
    // Mois de clôture (1-12). 12 = clôture au 31/12.
    mois_cloture: { type: Number, min: 1, max: 12, default: 12 },
    // Année de l'exercice en cours (ex: 2026 = exercice clos fin 2026).
    annee_courante: { type: Number, default: 2026 },
  },

  // Connexion Qonto (API thirdparty v2). Le secret n'est PAS renvoyé au front.
  qonto: {
    connected:   { type: Boolean, default: false },
    org_slug:    { type: String, trim: true },        // identifiant login (slug organisation)
    secret_key:  { type: String, trim: true, select: false }, // clé secrète Qonto (jamais exposée)
    iban:        { type: String, trim: true },
    last_sync_at:{ type: Date },
  },

  // Report à nouveau = clôture de l'exercice précédent (bilan d'ouverture N).
  // Nécessaire pour boucler la liasse. { comptes: [{account, label, solde}] }
  report_a_nouveau: {
    annee:  { type: Number },
    saisi:  { type: Boolean, default: false },
    comptes:{ type: Schema.Types.Mixed, default: [] },
  },

  // Régularité / clôture.
  cloture: {
    verrouille: { type: Boolean, default: false }, // exercice clôturé -> plus d'écritures
    date:       { type: Date },
  },

  // Attestation globale (option A) : l'utilisateur déclare détenir tous ses
  // justificatifs (dossier), sans les joindre un par un. @author Rabah Ziane - 2026-07-16
  justificatifs_atteste: { type: Boolean, default: false },

  active: { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

comptaCompanySchema.index({ name: 1 });
comptaCompanySchema.index({ active: 1 });

// Vue "sûre" pour le front (sans secret Qonto).
comptaCompanySchema.methods.toSafeJSON = function () {
  const o = this.toObject();
  if (o.qonto) delete o.qonto.secret_key;
  return o;
};

const ComptaCompany = mongoose.model('ComptaCompany', comptaCompanySchema);

export default ComptaCompany;
