import mongoose from 'mongoose';

const { Schema } = mongoose;

const lineSchema = new Schema({
  description: { type: String, required: true, trim: true },
  details: { type: String, trim: true },
  quantity: { type: Number, default: 1, min: 0 },
  unit: { type: String, default: 'forfait', trim: true },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: true });

const quickQuoteSchema = new Schema({
  ref: { type: String, unique: true, index: true },

  client: {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    company: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
  },

  prospectId: { type: Schema.Types.ObjectId, ref: 'Prospect' },

  title: { type: String, default: 'Devis projet sur mesure', trim: true },
  intro: { type: String, default: '', trim: true },
  lines: { type: [lineSchema], default: [] },

  subtotal: { type: Number, default: 0 }, // somme brute des lignes
  discountType: { type: String, enum: ['none', 'percent', 'amount'], default: 'none' },
  discountValue: { type: Number, default: 0 }, // % si type=percent, montant HT si type=amount
  discountAmount: { type: Number, default: 0 }, // montant HT calcule de la reduction
  subtotalAfterDiscount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 20 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 }, // = subtotalAfterDiscount (HT)
  totalTTC: { type: Number, default: 0 },

  currency: { type: String, default: 'EUR', uppercase: true, trim: true }, // EUR USD GBP CHF CAD AED MAD AUD ...
  secondaryCurrency: { type: String, uppercase: true, trim: true }, // affichage parallèle (optionnel)
  secondaryRate: { type: Number, default: 1 }, // 1 unité de currency = X secondaryCurrency

  language: { type: String, default: 'fr', lowercase: true, trim: true }, // fr, en, es, de, it, pt, ar, zh

  // Entite emettrice : 'fr' = DELIVERY Digital Nice (France), 'ae' = DELIVERY DIGITAL TECHNOLOGY FZCO (Dubai)
  issuer: { type: String, enum: ['fr', 'ae'], default: 'fr' },

  // Echeances de paiement : si vide, le rendu utilise le defaut 50/50 (acompte/livraison)
  paymentSchedule: {
    type: [{
      label: { type: String, trim: true }, // ex: "Acompte a la signature", "Solde a la livraison"
      percent: { type: Number, min: 0, max: 100 },
    }],
    default: [],
  },

  ciiEligible: { type: Boolean, default: false },
  ciiAmount: { type: Number, default: 0 },

  // Si true (defaut historique), la facture d'acompte PDF est envoyee automatiquement
  // au client juste apres acceptation du devis. Si false, la signature est juste enregistree
  // (mail confirmation a l'admin uniquement) et la facture sera envoyee manuellement plus tard.
  // @author Rabah Ziane - 2026-05-23
  autoSendInvoice: { type: Boolean, default: true },

  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'],
    default: 'draft',
    index: true,
  },

  validUntil: { type: Date },
  notes: { type: String, default: '', trim: true },
  publicToken: { type: String, index: true },

  sentAt: { type: Date },
  viewedAt: { type: Date },
  acceptedAt: { type: Date },
  acceptance: {
    signerName: { type: String },
    signerEmail: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    signedAt: { type: Date },
  },
  rejection: {
    reason: { type: String },
    rejectedAt: { type: Date },
    ip: { type: String },
  },
  // Facture d'acompte auto-emise a la signature. Trace pour badge "Facture envoyee" cote admin.
  // @author Rabah Ziane - 2026-05-11
  invoice: {
    ref: { type: String },
    amount: { type: Number },
    currency: { type: String },
    sentAt: { type: Date },
    sentTo: { type: String },
  },
}, { timestamps: true });

quickQuoteSchema.pre('save', function (next) {
  // Compute totals
  const round = (n) => Math.round(n * 100) / 100;
  this.subtotal = round((this.lines || []).reduce((sum, l) => sum + (l.quantity || 1) * (l.unitPrice || 0), 0));

  // Reduction
  if (this.discountType === 'percent' && this.discountValue > 0) {
    this.discountAmount = round(this.subtotal * (this.discountValue / 100));
  } else if (this.discountType === 'amount' && this.discountValue > 0) {
    this.discountAmount = round(Math.min(this.discountValue, this.subtotal));
  } else {
    this.discountAmount = 0;
  }
  this.subtotalAfterDiscount = round(this.subtotal - this.discountAmount);

  this.taxAmount = round(this.subtotalAfterDiscount * (this.taxRate / 100));
  this.total = this.subtotalAfterDiscount;
  this.totalTTC = round(this.subtotalAfterDiscount + this.taxAmount);

  if (this.ciiEligible) {
    this.ciiAmount = round(Math.min(this.subtotalAfterDiscount, 400000) * 0.20);
  } else {
    this.ciiAmount = 0;
  }

  // Generate ref if missing : DDQ-YYYY-XXXX (random 4-digit)
  if (!this.ref) {
    const y = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.ref = `DDQ-${y}-${rand}`;
  }
  if (!this.publicToken) {
    this.publicToken = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }
  if (!this.validUntil) {
    this.validUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  }
  next();
});

export default mongoose.models.QuickQuote || mongoose.model('QuickQuote', quickQuoteSchema);
