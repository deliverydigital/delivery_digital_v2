import mongoose from 'mongoose';

const { Schema } = mongoose;

// Invoice schema
const invoiceSchema = new Schema({
  invoice_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  client_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  training_session_id: {
    type: Schema.Types.ObjectId,
    ref: 'TrainingSession'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  issue_date: {
    type: Date,
    required: true
  },
  due_date: {
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
  payment_terms: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  paid_at: {
    type: Date
  },
  payment_method: {
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
invoiceSchema.index({ client_id: 1 });
invoiceSchema.index({ project_id: 1 });
invoiceSchema.index({ training_session_id: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ issue_date: -1 });
invoiceSchema.index({ due_date: 1 });
invoiceSchema.index({ invoice_number: 1 });

// Instance methods
invoiceSchema.methods.calculateTotals = function() {
  if (!this.items || !Array.isArray(this.items)) {
    return;
  }
  
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0));
  }, 0);
  
  this.tax_amount = this.subtotal * (this.tax_rate / 100);
  this.total_amount = this.subtotal + this.tax_amount;
};

invoiceSchema.methods.markAsPaid = function(paymentMethod = null) {
  this.status = 'paid';
  this.paid_at = new Date();
  if (paymentMethod) {
    this.payment_method = paymentMethod;
  }
  return this.save();
};

invoiceSchema.methods.isOverdue = function() {
  return new Date() > this.due_date && this.status !== 'paid';
};

invoiceSchema.methods.getDaysOverdue = function() {
  if (!this.isOverdue()) return 0;
  return Math.ceil((new Date() - this.due_date) / (1000 * 60 * 60 * 24));
};

// Static methods
invoiceSchema.statics.findByClient = function(clientId) {
  return this.find({ client_id: clientId })
    .populate('client_id', 'name email company')
    .populate('project_id', 'title')
    .populate('training_session_id', 'title')
    .sort({ created_at: -1 });
};

invoiceSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('client_id', 'name email company')
    .populate('project_id', 'title')
    .sort({ created_at: -1 });
};

invoiceSchema.statics.findOverdue = function() {
  return this.find({
    due_date: { $lt: new Date() },
    status: { $ne: 'paid' }
  }).populate('client_id', 'name email company');
};

invoiceSchema.statics.generateInvoiceNumber = async function() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await this.countDocuments();
  return `INV-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;
};

invoiceSchema.statics.getMonthlyRevenue = function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.aggregate([
    {
      $match: {
        status: 'paid',
        paid_at: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total_revenue: { $sum: '$total_amount' },
        invoice_count: { $sum: 1 }
      }
    }
  ]);
};

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

// Virtual for invoice age in days
invoiceSchema.virtual('ageInDays').get(function() {
  return Math.ceil((new Date() - this.created_at) / (1000 * 60 * 60 * 24));
});

// Virtual for days until due
invoiceSchema.virtual('daysUntilDue').get(function() {
  return Math.ceil((this.due_date - new Date()) / (1000 * 60 * 60 * 24));
});

// Ensure virtual fields are serialized
invoiceSchema.set('toJSON', { virtuals: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;