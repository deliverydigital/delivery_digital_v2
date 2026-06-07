/**
 * État de conformité d'un indicateur Qualiopi (RNQ - 32 indicateurs / 7 critères),
 * périmètre "actions de formation". Stocke le statut, les notes et les preuves (niveau
 * organisme) pour préparer chaque audit. Le catalogue est seedé au 1er accès.
 * @author Rabah Ziane · 2026-06-07
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

const proofSchema = new Schema({
  title: String,
  filePath: String,
  originalName: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const schema = new Schema({
  number: { type: Number, required: true, unique: true, index: true }, // 1..32
  criterion: { type: Number, required: true }, // 1..7
  title: { type: String, required: true },
  status: { type: String, enum: ['a_completer', 'conforme', 'non_conforme', 'non_applicable'], default: 'a_completer' },
  notes: { type: String, default: '' },
  proofs: { type: [proofSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.QualiopiIndicator || mongoose.model('QualiopiIndicator', schema);
