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

  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 20 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  totalTTC: { type: Number, default: 0 },

  currency: { type: String, default: 'EUR', uppercase: true, trim: true }, // EUR USD GBP CHF CAD AED MAD AUD ...
  secondaryCurrency: { type: String, uppercase: true, trim: true }, // affichage parallèle (optionnel)
  secondaryRate: { type: Number, default: 1 }, // 1 unité de currency = X secondaryCurrency

  ciiEligible: { type: Boolean, default: false },
  ciiAmount: { type: Number, default: 0 },

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
}, { timestamps: true });

quickQuoteSchema.pre('save', function (next) {
  // Compute totals
  this.subtotal = (this.lines || []).reduce((sum, l) => sum + (l.quantity || 1) * (l.unitPrice || 0), 0);
  this.taxAmount = Math.round(this.subtotal * (this.taxRate / 100) * 100) / 100;
  this.total = this.subtotal;
  this.totalTTC = Math.round((this.subtotal + this.taxAmount) * 100) / 100;
  if (this.ciiEligible) {
    this.ciiAmount = Math.round(Math.min(this.subtotal, 400000) * 0.20 * 100) / 100;
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
