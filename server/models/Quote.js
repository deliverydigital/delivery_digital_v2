import mongoose from 'mongoose';

const { Schema } = mongoose;

// Quote schema
const quoteSchema = new Schema({
  client_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    default: 'draft'
  },
  valid_until: {
    type: Date,
    required: true
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax_rate: {
    type: Number,
    default: 20.00,
    min: 0,
    max: 100
  },
  tax_amount: {
    type: Number,
    required: true,
    min: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'EUR',
    maxlength: 3
  },
  notes: {
    type: String,
    trim: true
  },
  items: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Items array cannot be empty'
    }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
quoteSchema.index({ client_id: 1 });
quoteSchema.index({ project_id: 1 });
quoteSchema.index({ status: 1 });
quoteSchema.index({ valid_until: 1 });
quoteSchema.index({ created_at: -1 });

// Instance methods
quoteSchema.methods.calculateTotals = function() {
  if (!this.items || !Array.isArray(this.items)) {
    return;
  }
  
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0));
  }, 0);
  
  this.tax_amount = this.subtotal * (this.tax_rate / 100);
  this.total_amount = this.subtotal + this.tax_amount;
};

quoteSchema.methods.isExpired = function() {
  return new Date() > this.valid_until;
};

quoteSchema.methods.canBeAccepted = function() {
  return this.status === 'sent' && !this.isExpired();
};

// Static methods
quoteSchema.statics.findByClient = function(clientId) {
  return this.find({ client_id: clientId })
    .populate('client_id', 'name email company')
    .populate('project_id', 'title')
    .sort({ created_at: -1 });
};

quoteSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('client_id', 'name email company')
    .populate('project_id', 'title')
    .sort({ created_at: -1 });
};

quoteSchema.statics.findExpired = function() {
  return this.find({
    valid_until: { $lt: new Date() },
    status: { $in: ['draft', 'sent'] }
  }).populate('client_id', 'name email company');
};

quoteSchema.statics.getMonthlyStats = function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.aggregate([
    {
      $match: {
        created_at: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total_amount: { $sum: '$total_amount' }
      }
    }
  ]);
};

// Pre-save middleware to calculate totals
quoteSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

// Virtual for quote age in days
quoteSchema.virtual('ageInDays').get(function() {
  return Math.ceil((new Date() - this.created_at) / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiration
quoteSchema.virtual('daysUntilExpiration').get(function() {
  return Math.ceil((this.valid_until - new Date()) / (1000 * 60 * 60 * 24));
});

// Ensure virtual fields are serialized
quoteSchema.set('toJSON', { virtuals: true });

const Quote = mongoose.model('Quote', quoteSchema);

export default Quote;