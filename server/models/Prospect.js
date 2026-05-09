import mongoose from 'mongoose';

const { Schema } = mongoose;

const timelineEntrySchema = new Schema(
  {
    kind: { type: String, enum: ['note', 'email', 'call', 'chat', 'status', 'tag', 'task'], required: true },
    body: { type: String, default: '' },
    meta: { type: Schema.Types.Mixed },
    by: { type: String, default: 'admin' },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const prospectSchema = new Schema(
  {
    email: { type: String, lowercase: true, trim: true, index: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    fullName: { type: String, trim: true, index: true },
    company: { type: String, trim: true, index: true },
    role: { type: String, trim: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    city: { type: String, trim: true, index: true },
    country: { type: String, trim: true, default: 'France' },
    industry: { type: String, trim: true, index: true },
    siret: { type: String, trim: true },

    source: {
      type: String,
      enum: ['chat', 'manual', 'import-csv', 'osm', 'sirene', 'linkedin', 'referral', 'website', 'other'],
      default: 'manual',
      index: true,
    },
    sourceRef: { type: Schema.Types.Mixed },

    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'meeting', 'proposal', 'won', 'lost', 'archived'],
      default: 'new',
      index: true,
    },

    tags: { type: [String], default: [], index: true },
    score: { type: Number, default: 0, min: 0, max: 100 },

    estimatedValueEur: { type: Number, default: 0 },
    projectType: { type: String, trim: true },

    summary: { type: String, default: '' },

    lastContactAt: { type: Date },
    nextFollowUpAt: { type: Date, index: true },

    timeline: [timelineEntrySchema],

    chatSessionIds: { type: [String], default: [], index: true },

    assignedTo: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

prospectSchema.index({ status: 1, createdAt: -1 });
prospectSchema.index({ email: 1, company: 1 });

prospectSchema.pre('save', function (next) {
  if (!this.fullName) {
    const parts = [this.firstName, this.lastName].filter(Boolean);
    this.fullName = parts.join(' ').trim();
  }
  next();
});

export default mongoose.models.Prospect || mongoose.model('Prospect', prospectSchema);
