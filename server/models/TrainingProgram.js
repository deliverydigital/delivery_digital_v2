import mongoose from 'mongoose';

const { Schema } = mongoose;

// Training Program schema
const trainingProgramSchema = new Schema({
  program_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  target_audience: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['web', 'design', 'languages', 'office', 'safety', 'business', 'health', 'management'],
    default: 'web'
  },
  duration_hours: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  max_participants: {
    type: Number,
    default: 12,
    min: 1
  },
  prerequisites: {
    type: String,
    default: ''
  },
  objectives: [String],
  training_modalities: [String],
  methods: [String],
  evaluation_methods: [String],
  accessibility_info: {
    type: String,
    default: 'Formation accessible aux personnes en situation de handicap'
  },
  access_delay: {
    type: String,
    default: '1 semaine'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_featured: {
    type: Boolean,
    default: false
  },
  certification_type: {
    type: String,
    default: ''
  },
  certification_provider: {
    type: String,
    default: ''
  },
  opco_eligible: {
    type: Boolean,
    default: true
  },
  cpf_eligible: {
    type: Boolean,
    default: false
  },
  satisfaction_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  success_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  recommendation_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  attendance_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  satisfaction: {
    type: Number,
    default: 0,
    min: 1,
    max: 10
  },

  // PDF Documents as embedded documents
  documents: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    filename: String,
    original_name: String,
    file_type: String,
    file_size: Number,
    file_path: String,
    document_type: {
      type: String,
      enum: ['program', 'guide', 'certificate', 'evaluation', 'other'],
      default: 'program'
    },
    is_public: {
      type: Boolean,
      default: true
    },
    download_count: {
      type: Number,
      default: 0
    },
    uploaded_by: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Modules as embedded documents
  modules: [{
    title: String,
    duration_hours: Number,
    topics: [String],
    order: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Indexes
trainingProgramSchema.index({ program_id: 1 });
trainingProgramSchema.index({ category: 1 });
trainingProgramSchema.index({ is_active: 1 });
trainingProgramSchema.index({ is_featured: 1 });
trainingProgramSchema.index({ opco_eligible: 1 });
trainingProgramSchema.index({ cpf_eligible: 1 });
trainingProgramSchema.index({ 'documents.document_type': 1 });

// Instance methods
trainingProgramSchema.methods.addDocument = function(documentData) {
  this.documents.push(documentData);
  return this.save();
};

trainingProgramSchema.methods.removeDocument = function(documentId) {
  this.documents = this.documents.filter(doc => doc._id.toString() !== documentId);
  return this.save();
};

trainingProgramSchema.methods.incrementDownloadCount = function(documentId) {
  const document = this.documents.id(documentId);
  if (document) {
    document.download_count += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static methods
trainingProgramSchema.statics.findByCategory = function(category) {
  return this.find({ category, is_active: true }).sort({ title: 1 });
};

trainingProgramSchema.statics.findActivePrograms = function() {
  return this.find({ is_active: true }).sort({ title: 1 });
};

trainingProgramSchema.statics.findFeaturedPrograms = function() {
  return this.find({ is_active: true, is_featured: true }).sort({ title: 1 });
};

trainingProgramSchema.statics.findOPCOEligible = function() {
  return this.find({ is_active: true, opco_eligible: true }).sort({ title: 1 });
};

trainingProgramSchema.statics.searchPrograms = function(query) {
  return this.find({
    is_active: true,
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { 'modules.title': { $regex: query, $options: 'i' } },
      { 'modules.topics': { $in: [new RegExp(query, 'i')] } }
    ]
  }).sort({ title: 1 });
};

const TrainingProgram = mongoose.model('TrainingProgram', trainingProgramSchema);

export default TrainingProgram;