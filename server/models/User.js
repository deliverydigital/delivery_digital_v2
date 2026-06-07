import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Schema } = mongoose;

// User schema
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password_hash: {
    type: String,
    required: true
  },
  // Copie chiffree (AES) du mot de passe en clair des comptes AGENCE, pour permettre au
  // superadmin de le RE-AFFICHER sans le changer ("Renvoyer accès"). select:false = jamais
  // renvoye sauf demande explicite. @author Rabah Ziane - 2026-06-06
  agencyPwEnc: {
    type: String,
    select: false
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  company: {
    type: String,
    trim: true,
    maxlength: 255
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  role: {
    type: String,
    enum: ['client', 'admin', 'project_manager', 'trainer', 'developer', 'agence', 'agence_commercial'],
    default: 'client'
  },
  // Commercial rattache a une agence (sous-compte). @author Rabah Ziane - 2026-06-02
  parentAgencyId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  // Cle API d'integration (comptes agence partenaire) - lecture seule via /api/agency/v1.
  // @author Rabah Ziane - 2026-06-02
  apiKey: { type: String, index: true },
  // Commission agence : gain = commissionFix (€) + commissionPercent % du montant HT du
  // dossier, versee a la reception du paiement OPCO. Standard : 120 € + 15%.
  commissionFix: { type: Number, default: 120 },
  commissionPercent: { type: Number, default: 15 },
  // Coordonnees bancaires de l'agence (pour verser les commissions).
  // iban/bic conserves pour compat FR/SEPA ; bankCountry + bankData gerent les
  // autres pays (les champs s'adaptent au pays cote UI). @author Rabah Ziane - 2026-06-02
  iban: { type: String, trim: true },
  bic: { type: String, trim: true },
  accountHolder: { type: String, trim: true },
  bankCountry: { type: String, default: 'FR' },
  bankData: { type: Schema.Types.Mixed, default: {} }, // champs RIB specifiques au pays
  ribPdfUrl: { type: String, trim: true },             // PDF du RIB (obligatoire pour valider le compte)
  bankValidated: { type: Boolean, default: false },    // compte bancaire valide par le superadmin DD
  // Infos entreprise de l'agence (bandeau a renseigner, a valider cote superadmin).
  companyInfo: {
    legalName: String, regNumber: String, vatNumber: String,
    address: String, city: String, postalCode: String, country: String,
    repName: String, repFunction: String,
  },
  // Signature du contrat de partenariat (validee ensuite cote superadmin).
  contract: {
    signed: { type: Boolean, default: false },
    signedBy: String, signedFunction: String, signedIp: String, signedAt: Date,
    validated: { type: Boolean, default: false },
  },
  // True quand le superadmin a valide infos entreprise + RIB + contrat.
  onboardingValidated: { type: Boolean, default: false },
  // === Champs FORMATEUR (role 'trainer') === @author Rabah Ziane - 2026-06-06
  hourlyRate: { type: Number, default: 0 },
  trainerSkills: { type: [String], default: [] },
  // Préférences de rappel configurables par le formateur. @author Rabah Ziane - 2026-06-07
  reminderPrefs: {
    course48: { type: Boolean, default: true },
    course24: { type: Boolean, default: true },
    course1: { type: Boolean, default: true },
    weeklyAvailability: { type: Boolean, default: true },
    weeklyDay: { type: Number, default: 5 },
    weeklyHour: { type: Number, default: 10 },
    weeklyLastSent: { type: Date },
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'active'
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  email_verification_token: String,
  password_reset_token: String,
  password_reset_expires: Date,
  last_login: Date,
  
  // Client-specific fields (embedded document approach)
  client_info: {
    company_size: {
      type: String,
      enum: ['small', 'medium', 'large', 'enterprise']
    },
    industry: String,
    website: String,
    address: String,
    city: String,
    postal_code: String,
    country: {
      type: String,
      default: 'France'
    },
    vat_number: String,
    siret: String,
    billing_address: String,
    billing_city: String,
    billing_postal_code: String,
    billing_country: {
      type: String,
      default: 'France'
    },
    preferred_language: {
      type: String,
      default: 'fr'
    },
    communication_preferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      phone: { type: Boolean, default: true }
    },
    notes: String
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { 
    transform: function(doc, ret) {
      // Remove sensitive fields when converting to JSON
      delete ret.password_hash;
      delete ret.password_reset_token;
      delete ret.email_verification_token;
      return ret;
    }
  }
});

// Indexes for better performance
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'client_info.company': 1 });

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.password_reset_token = resetToken;
  this.password_reset_expires = Date.now() + 3600000; // 1 hour
  return resetToken;
};

// Static methods
userSchema.statics.hashPassword = async function(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ status: 'active' });
};

userSchema.statics.findByRole = function(role) {
  return this.find({ role });
};

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password_hash')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password_hash, 12);
    this.password_hash = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Create and export the model
const User = mongoose.model('User', userSchema);

export default User;