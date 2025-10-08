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
    enum: ['client', 'admin', 'trainer', 'developer'],
    default: 'client'
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