import mongoose from 'mongoose';

const { Schema } = mongoose;

const seoContentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['city-service', 'article', 'faq'],
      required: true,
      index: true,
    },
    slug: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'rejected'],
      default: 'draft',
      index: true,
    },

    // SEO
    title: { type: String, required: true },
    metaTitle: { type: String },
    metaDescription: { type: String },
    targetKeyword: { type: String, index: true },

    // Content (Markdown for body)
    body: { type: String, required: true },

    // Geographic targeting (for city-service type)
    city: { type: String, index: true },
    service: { type: String, index: true },

    // Multi-country / multi-language (ajoute pour SEO Golfe + futur)
    // @author Rabah Ziane - 2026-05-13
    country: { type: String, index: true }, // ISO code: FR, QA, SA, AE...
    lang: { type: String, default: 'fr', index: true }, // fr, en, ar...

    // FAQ items (for faq type)
    faqItems: [
      {
        question: String,
        answer: String,
      },
    ],

    // JSON-LD structured data (auto-generated, can be edited)
    jsonLd: { type: Schema.Types.Mixed },

    // Generation context
    generationPrompt: { type: String },
    generationModel: { type: String, default: 'claude-opus-4-7' },

    // Audit
    publishedAt: { type: Date },
    createdBy: { type: String, default: 'agent' },
  },
  { timestamps: true }
);

seoContentSchema.index({ status: 1, type: 1, createdAt: -1 });
seoContentSchema.index({ country: 1, status: 1 });

export default mongoose.models.SeoContent || mongoose.model('SeoContent', seoContentSchema);
