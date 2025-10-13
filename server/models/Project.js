import mongoose from 'mongoose';

const { Schema } = mongoose;

// Project schema
const projectSchema = new Schema({
  client_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  type: {
    type: String,
    required: true,
    enum: ['web', 'mobile', 'enterprise', 'cloud', 'other']
  },
  status: {
    type: String,
    enum: ['submitted', 'reviewing', 'in_progress', 'completed', 'on_hold', 'cancelled'],
    default: 'submitted'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  budget_range: {
    type: String,
    enum: ['small', 'medium', 'large', 'enterprise']
  },
  estimated_budget: {
    type: Number,
    min: 0
  },
  actual_cost: {
    type: Number,
    min: 0
  },
  timeline: {
    type: String,
    enum: ['urgent', 'normal', 'flexible', 'longterm']
  },
  start_date: Date,
  end_date: Date,
  estimated_hours: {
    type: Number,
    min: 0
  },
  actual_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  completion_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  assigned_to: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  figma_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid URL format'
    }
  },
  gitlab_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid URL format'
    }
  },
  production_url: String,
  staging_url: String,
  notes: String,
  requirements: Schema.Types.Mixed,
  technical_specs: Schema.Types.Mixed,
  deliverables: Schema.Types.Mixed,
  milestones: [{
    title: String,
    description: String,
    due_date: Date,
    completed: { type: Boolean, default: false },
    completed_at: Date
  }],
  risks: [{
    description: String,
    impact: { type: String, enum: ['low', 'medium', 'high'] },
    probability: { type: String, enum: ['low', 'medium', 'high'] },
    mitigation: String
  }],
  links: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid URL format'
      }
    },
    visibleTo: {
      type: [String],
      enum: ['admin', 'project_manager', 'client'],
      default: ['admin', 'project_manager', 'client']
    }
  }],

  // Attachments as embedded documents
  attachments: [{
    filename: String,
    original_name: String,
    file_type: String,
    file_size: Number,
    file_path: String,
    uploaded_by: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],

  // Task permissions by role
  task_permissions: {
    client: {
      view: { type: Boolean, default: true },
      add: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      draggable: { type: Boolean, default: false }
    },
    project_manager: {
      view: { type: Boolean, default: true },
      add: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: true },
      draggable: { type: Boolean, default: true }
    },
    developer: {
      view: { type: Boolean, default: true },
      add: { type: Boolean, default: false },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: false },
      draggable: { type: Boolean, default: true }
    },
    trainer: {
      view: { type: Boolean, default: true },
      add: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      draggable: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true
});

// Indexes
projectSchema.index({ client_id: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ assigned_to: 1 });
projectSchema.index({ type: 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ createdAt: -1 });

// Instance methods
projectSchema.methods.updateProgress = function(percentage) {
  this.completion_percentage = Math.max(0, Math.min(100, percentage));
  
  // Auto-update status based on progress
  if (percentage === 100 && this.status !== 'completed') {
    this.status = 'completed';
  } else if (percentage > 0 && this.status === 'submitted') {
    this.status = 'in_progress';
  }
  
  return this.save();
};

projectSchema.methods.addMilestone = function(milestone) {
  this.milestones.push(milestone);
  return this.save();
};

projectSchema.methods.completeMilestone = function(milestoneId) {
  const milestone = this.milestones.id(milestoneId);
  if (milestone) {
    milestone.completed = true;
    milestone.completed_at = new Date();
  }
  return this.save();
};

projectSchema.methods.hasTaskPermission = function(role, action) {
  if (role === 'admin') {
    return true;
  }

  if (!this.task_permissions || !this.task_permissions[role]) {
    const defaults = {
      client: { view: true, add: false, update: false, delete: false, draggable: false },
      project_manager: { view: true, add: true, update: true, delete: true, draggable: true },
      developer: { view: true, add: false, update: true, delete: false, draggable: true },
      trainer: { view: true, add: false, update: false, delete: false, draggable: false }
    };
    return defaults[role]?.[action] || false;
  }

  return this.task_permissions[role][action] || false;
};

// Static methods
projectSchema.statics.findByClient = function(clientId) {
  return this.find({ client_id: clientId }).populate('client_id', 'name email company').populate('assigned_to', 'name email');
};

projectSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('client_id', 'name email company').populate('assigned_to', 'name email');
};

projectSchema.statics.findActiveProjects = function() {
  return this.find({ 
    status: { $in: ['reviewing', 'in_progress'] } 
  }).populate('client_id', 'name email company').populate('assigned_to', 'name email');
};

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  if (this.start_date && this.end_date) {
    return Math.ceil((this.end_date - this.start_date) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Ensure virtual fields are serialized
projectSchema.set('toJSON', { virtuals: true });

const Project = mongoose.model('Project', projectSchema);

export default Project;