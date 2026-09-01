import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Une écriture / transaction comptable rattachée à une entreprise.
 * Provient de Qonto (sync auto, idempotent via external_id) ou d'une saisie
 * manuelle. La catégorisation (category_key -> comptaCatalog) pilote le compte
 * PCG, la nature (produit/charge/immo/neutre) et la TVA.
 *
 * @author Rabah Ziane · 2026-07-07
 */
const comptaEntrySchema = new Schema({
  company_id: { type: Schema.Types.ObjectId, ref: 'ComptaCompany', required: true },

  source:      { type: String, enum: ['qonto', 'manuel'], default: 'qonto' },
  // Id Qonto de la transaction -> évite les doublons au re-sync.
  external_id: { type: String, trim: true },
  // Compte bancaire source (une entreprise a plusieurs comptes Qonto).
  iban:        { type: String, trim: true },
  compte_nom:  { type: String, trim: true }, // ex. "Compte principal", "Trésorerie"
  // Données Qonto (référence / audit de la catégorisation auto).
  qonto_category: { type: String, trim: true },
  operation_type: { type: String, trim: true },
  // Justificatifs (factures) attachés dans Qonto.
  attachment_ids: { type: [String], default: [] },
  // Opération étrangère (devise ≠ EUR / hors EU) : TVA non récupérable.
  local_currency: { type: String, trim: true },
  is_external: { type: Boolean, default: false },
  // Dépense éligible au Crédit d'Impôt Innovation (CII 20 %).
  cii_eligible: { type: Boolean, default: false },

  date:        { type: Date, required: true }, // date d'opération (settled_at Qonto)
  label:       { type: String, trim: true, maxlength: 300 },
  counterparty:{ type: String, trim: true, maxlength: 200 }, // émetteur / bénéficiaire

  // Montant signé en euros : positif = encaissement (crédit), négatif = décaissement (débit).
  amount:      { type: Number, required: true },
  currency:    { type: String, default: 'EUR', maxlength: 3 },
  side:        { type: String, enum: ['credit', 'debit'], required: true },

  // Catégorisation comptable (clé du catalogue comptaCatalog.js).
  category_key:{ type: String, trim: true, default: null },
  account:     { type: String, trim: true }, // compte PCG résolu depuis la catégorie
  nature:      { type: String, enum: ['produit', 'charge', 'immobilisation', 'neutre', 'tva', null], default: null },

  // TVA.
  tva_rate:    { type: Number, default: 0 },   // 0 | 5.5 | 10 | 20
  amount_ht:   { type: Number, default: 0 },   // base HT
  tva_amount:  { type: Number, default: 0 },   // montant de TVA
  tva_sens:    { type: String, enum: ['collectee', 'deductible', 'aucune'], default: 'aucune' },

  // Justificatif (facture/reçu) - chemin public une fois uploadé.
  justificatif:{ type: String, default: null },

  // Cycle de vie : à catégoriser -> catégorisée -> lettrée/validée.
  status:      { type: String, enum: ['a_categoriser', 'categorisee', 'validee'], default: 'a_categoriser' },

  notes:       { type: String, trim: true },

  // Case "traité" cochée manuellement par l'utilisateur (clic / glisser dans la liste)
  // -> ligne surlignée en vert. Purement visuel, n'affecte pas les calculs.
  // @author Rabah Ziane - 2026-07-16
  reviewed:    { type: Boolean, default: false },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

comptaEntrySchema.index({ company_id: 1, date: -1 });
comptaEntrySchema.index({ company_id: 1, status: 1 });
// Unicité d'une transaction Qonto par entreprise (sync idempotent).
comptaEntrySchema.index({ company_id: 1, external_id: 1 }, { unique: true, partialFilterExpression: { external_id: { $type: 'string' } } });

const ComptaEntry = mongoose.model('ComptaEntry', comptaEntrySchema);

export default ComptaEntry;
