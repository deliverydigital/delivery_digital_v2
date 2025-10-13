import mongoose from 'mongoose';

const defaultTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  estimatedHours: {
    type: Number,
    default: 0,
    min: 0
  },
  orderIndex: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const projectTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  defaultTasks: [defaultTaskSchema]
}, {
  timestamps: true
});

projectTypeSchema.index({ name: 1 });

const ProjectType = mongoose.model('ProjectType', projectTypeSchema);

export default ProjectType;
