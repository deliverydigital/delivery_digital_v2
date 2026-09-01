import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Suivi d'une obligation déclarative (liasse IS, solde 2572, acompte 2571,
 * TVA CA12, CII, CIR…) : statut à faire / déposé, échéance, numéro et date de
 * dépôt, et accusé de réception attaché (preuve du dépôt).
 * @author Rabah Ziane · 2026-07-08
 */
const comptaDeclarationSchema = new Schema({
  company_id: { type: Schema.Types.ObjectId, ref: 'ComptaCompany', required: true, index: true },
  type:     { type: String, required: true }, // liasse_is | solde_is_2572 | acompte_is_2571 | tva_ca12 | cii | cir | autre
  label:    { type: String, required: true },
  annee:    { type: Number },
  echeance: { type: Date },
  status:   { type: String, enum: ['a_faire', 'depose'], default: 'a_faire' },
  depose_le:    { type: Date },
  numero_depot: { type: String, trim: true },
  montant:  { type: Number },   // IS, crédit, solde… (informatif)
  note:     { type: String, trim: true },
  ordre:    { type: Number, default: 0 },
  // Accusé de réception / justificatif attaché (stocké hors dossier public).
  document: {
    filename:    { type: String },  // nom d'origine
    stored:      { type: String },  // chemin relatif du fichier stocké
    mime:        { type: String },
    size:        { type: Number },
    uploaded_at: { type: Date },
  },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

comptaDeclarationSchema.index({ company_id: 1, ordre: 1 });

export default mongoose.model('ComptaDeclaration', comptaDeclarationSchema);
