import mongoose from 'mongoose';

const { Schema } = mongoose;

// Task schema
const taskSchema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
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
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done', 'blocked'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assigned_to: {
    type: String,
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  due_date: Date,
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
  tags: [String],
  dependencies: [{
    type: Schema.Types.ObjectId,
    ref: 'Task'
  }],
  watchers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  position: {
    type: Number,
    default: 0
  },

  // Comments as embedded documents
  comments: [{
    author_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    is_edited: {
      type: Boolean,
      default: false
    },
    edited_at: Date,
    created_at: {
      type: Date,
      default: Date.now
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

  // Checklist as embedded documents
  checklist: [{
    title: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    position: {
      type: Number,
      default: 0
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ project_id: 1 });
taskSchema.index({ assigned_to: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ due_date: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ position: 1 });

// Instance methods
taskSchema.methods.addComment = function(authorId, content) {
  this.comments.push({
    author_id: authorId,
    content: content
  });
  return this.save();
};

taskSchema.methods.addChecklistItem = function(title, position = 0) {
  this.checklist.push({
    title,
    position
  });
  return this.save();
};

taskSchema.methods.toggleChecklistItem = function(itemId) {
  const item = this.checklist.id(itemId);
  if (item) {
    item.completed = !item.completed;
  }
  return this.save();
};

taskSchema.methods.updateProgress = function() {
  if (this.checklist.length > 0) {
    const completedItems = this.checklist.filter(item => item.completed).length;
    this.completion_percentage = Math.round((completedItems / this.checklist.length) * 100);
  }
  return this.save();
};

// Static methods
taskSchema.statics.findByProject = function(projectId, filters = {}) {
  let query = { project_id: projectId };

  if (filters.status) query.status = filters.status;
  if (filters.assigned_to) query.assigned_to = filters.assigned_to;
  if (filters.priority) query.priority = filters.priority;

  return this.find(query)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('comments.author_id', 'name email role')
      .sort({ position: 1, createdAt: -1 });
};

taskSchema.statics.findOverdue = function() {
  return this.find({
    due_date: { $lt: new Date() },
    status: { $ne: 'done' }
  }).populate('assigned_to', 'name email')
      .populate('project_id', 'title client_id');
};

taskSchema.statics.findByAssignee = function(userId) {
  return this.find({ assigned_to: userId })
      .populate('project_id', 'title client_id')
      .sort({ due_date: 1 });
};

const Task = mongoose.model('Task', taskSchema);

export default Task;