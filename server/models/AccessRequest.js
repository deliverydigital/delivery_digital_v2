/**
 * Demandes d'acces client (deliverydigital.fr) : une agence (ou l'admin) demande
 * a un client de transmettre des identifiants (hebergement, CMS, OPCO, etc.) de
 * facon securisee. Le client saisit sur une page dediee (lien token), transmis
 * en HTTPS, chiffres AES-256-GCM au repos. Seul l'admin DD dechiffre (reveal).
 * @author Rabah Ziane - 2026-06-02
 */
import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

function aesKey() {
  const secret = process.env.ACCESS_SECRET || process.env.JWT_SECRET || 'dev-insecure-secret';
  return crypto.createHash('sha256').update('access-req-v1:' + secret).digest();
}
export function encryptField(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', aesKey(), iv);
  const e = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), e]).toString('base64');
}
export function decryptField(blob) {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12), tag = buf.subarray(12, 28), e = buf.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', aesKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(e), d.final()]).toString('utf8');
}

const accessRequestSchema = new Schema({
  token: { type: String, index: true },
  agencyId: { type: Schema.Types.ObjectId, ref: 'User' },
  agencyName: String,
  commercialId: { type: Schema.Types.ObjectId, ref: 'User' },
  clientEmail: { type: String, required: true, lowercase: true, trim: true },
  label: { type: String, default: 'Accès à votre compte' }, // ce qu'on demande
  status: { type: String, enum: ['pending', 'received', 'cancelled'], default: 'pending', index: true },
  expiresAt: Date,
  receivedAt: Date,
  encLogin: String,
  encPassword: String,
  encNote: String,
}, { timestamps: true });

export default mongoose.models.AccessRequest || mongoose.model('AccessRequest', accessRequestSchema);
