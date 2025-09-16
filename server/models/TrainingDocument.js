import mongoose from 'mongoose';

const { Schema } = mongoose;

// Training Document schema
const trainingDocumentSchema = new Schema({
  program_id: {
    type: String,
    required: true,
    trim: true
  },
  program_name: {
    type: String,
    required: true,
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
    trim: true
  },
  filename: {
    type: String,
    required: true
  },
  original_name: {
    type: String,
    required: true
  },
  file_type: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  file_path: {
    type: String,
    required: true
  },
  download_count: {
    type: Number,
    default: 0
  },
  is_public: {
    type: Boolean,
    default: true
  },
  uploaded_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['program', 'guide', 'certificate', 'evaluation', 'other'],
    default: 'program'
  },
  tags: [String],
  version: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true
});

// Indexes
trainingDocumentSchema.index({ program_id: 1 });
trainingDocumentSchema.index({ program_name: 1 });
trainingDocumentSchema.index({ category: 1 });
trainingDocumentSchema.index({ is_public: 1 });
trainingDocumentSchema.index({ uploaded_by: 1 });
trainingDocumentSchema.index({ createdAt: -1 });

// Instance methods
trainingDocumentSchema.methods.incrementDownloadCount = function() {
  this.download_count += 1;
  return this.save();
};

// Static methods
trainingDocumentSchema.statics.findByProgram = function(programId) {
  return this.find({ program_id: programId, is_public: true })
    .populate('uploaded_by', 'name email')
    .sort({ createdAt: -1 });
};

trainingDocumentSchema.statics.findByCategory = function(category) {
  return this.find({ category, is_public: true })
    .populate('uploaded_by', 'name email')
    .sort({ createdAt: -1 });
};

trainingDocumentSchema.statics.getPopularDocuments = function(limit = 10) {
  return this.find({ is_public: true })
    .populate('uploaded_by', 'name email')
    .sort({ download_count: -1 })
    .limit(limit);
};

trainingDocumentSchema.statics.searchDocuments = function(query) {
  return this.find({
    is_public: true,
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { program_name: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  }).populate('uploaded_by', 'name email')
    .sort({ createdAt: -1 });
};

const TrainingDocument = mongoose.model('TrainingDocument', trainingDocumentSchema);

export default TrainingDocument;