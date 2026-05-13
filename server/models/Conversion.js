/**
 * Conversion - evenements de conversion trackes pour Google Ads + dashboard interne.
 *
 * type : 'contact_submit' | 'phone_click' | 'email_click' | 'quote_click'
 *
 * RGPD : aucune donnee personnelle en clair. L'IP est hashee SHA-256 + salt.
 * Le UA est tronque a 100 chars (suffisant pour distinguer device/browser).
 *
 * @author Rabah Ziane - 2026-05-13
 */
import mongoose from 'mongoose';

const CONVERSION_TYPES = ['contact_submit', 'phone_click', 'email_click', 'quote_click'];

const ConversionSchema = new mongoose.Schema({
  type:        { type: String, enum: CONVERSION_TYPES, required: true, index: true },
  page:        { type: String, default: '' },           // pathname de la page d'origine
  referrer:    { type: String, default: '' },           // document.referrer cote front
  utm_source:  { type: String, default: '', index: true },
  utm_medium:  { type: String, default: '' },
  utm_campaign:{ type: String, default: '' },
  utm_term:    { type: String, default: '' },
  utm_content: { type: String, default: '' },
  ipHash:      { type: String, default: '' },           // sha256(ip + salt) tronque a 16 chars
  ua:          { type: String, default: '' },           // user-agent tronque a 100
  metadata:    { type: mongoose.Schema.Types.Mixed, default: {} }, // libre, ex: value, target
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

ConversionSchema.index({ createdAt: -1 });
ConversionSchema.index({ type: 1, createdAt: -1 });
ConversionSchema.index({ page: 1, createdAt: -1 });

export { CONVERSION_TYPES };
export default mongoose.models.Conversion || mongoose.model('Conversion', ConversionSchema);
