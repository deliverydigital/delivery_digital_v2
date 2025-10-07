import mongoose from 'mongoose';

const { Schema } = mongoose;

// Message schema
const messageSchema = new Schema({
  project_id: {
    type: String
  },
  sender_id: {
    type: String,
    required: true
  },
  recipient_id: {
    type: String
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 255
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  message_type: {
    type: String,
    enum: ['project', 'support', 'notification', 'system'],
    default: 'project'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: Date,
  parent_message_id: {
    type: String
  },
  thread_id: {
    type: String,
    ref: 'Message'
  },
  
  // Attachments as embedded documents
  attachments: [{
    filename: String,
    original_name: String,
    file_type: String,
    file_size: Number,
    file_path: String,
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ project_id: 1 });
messageSchema.index({ sender_id: 1 });
messageSchema.index({ recipient_id: 1 });
messageSchema.index({ is_read: 1 });
messageSchema.index({ message_type: 1 });
messageSchema.index({ createdAt: -1 });

// Instance methods
messageSchema.methods.markAsRead = function() {
  this.is_read = true;
  this.read_at = new Date();
  return this.save();
};

messageSchema.methods.addAttachment = function(attachment) {
  this.attachments.push(attachment);
  return this.save();
};

// Static methods
messageSchema.statics.findByProject = function(projectId) {
  return this.find({ project_id: projectId })
    .populate('sender_id', 'name email role')
    .populate('recipient_id', 'name email role')
    .sort({ createdAt: -1 });
};

messageSchema.statics.findUnreadByUser = function(userId) {
  return this.find({ 
    recipient_id: userId, 
    is_read: false 
  }).populate('sender_id', 'name email role');
};

messageSchema.statics.findConversation = function(user1Id, user2Id) {
  return this.find({
    $or: [
      { sender_id: user1Id, recipient_id: user2Id },
      { sender_id: user2Id, recipient_id: user1Id }
    ]
  }).populate('sender_id', 'name email role')
    .populate('recipient_id', 'name email role')
    .sort({ createdAt: 1 });
};

const Message = mongoose.model('Message', messageSchema);

export default Message;