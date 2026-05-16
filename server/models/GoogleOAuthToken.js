/**
 * Token OAuth Google stocke pour acceder a Google Search Console API
 * via un user humain (au lieu d'un service account, qui foire en
 * silencieux apres 4j d'attente IAM sync chez Google).
 *
 * 1 doc par service (gsc, ga4...) - upsert sur service.
 *
 * @author Rabah Ziane - 2026-05-17
 */
import mongoose from 'mongoose';

const GoogleOAuthTokenSchema = new mongoose.Schema({
  service:      { type: String, required: true, unique: true, index: true }, // 'gsc'
  refreshToken: { type: String, required: true },
  accessToken:  { type: String, default: '' },
  accessTokenExpiresAt: { type: Date, default: null },
  scopes:       [{ type: String }],
  googleUserEmail: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.GoogleOAuthToken || mongoose.model('GoogleOAuthToken', GoogleOAuthTokenSchema);
