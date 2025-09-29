import mongoose from 'mongoose';

const { Schema } = mongoose;

// Category schema
const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 255
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  icon: {
    type: String,
    default: 'folder'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ is_active: 1 });
categorySchema.index({ order: 1 });

// Instance methods
categorySchema.methods.generateSlug = function() {
  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return this.slug;
};

// Static methods
categorySchema.statics.findActive = function() {
  return this.find({ is_active: true }).sort({ order: 1, name: 1 });
};

categorySchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, is_active: true });
};

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.generateSlug();
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

export default Category;