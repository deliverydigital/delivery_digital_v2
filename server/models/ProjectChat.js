import mongoose from 'mongoose';

const { Schema } = mongoose;

const messageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const projectChatSchema = new Schema({
  // Conversation id (sessionId for legacy anonymous, also primary id for authed convs)
  sessionId: { type: String, required: true, index: true },

  // Owner (chat-only soft user) - required for authed convs
  chatUserId: { type: Schema.Types.ObjectId, ref: 'ChatUser', default: null, index: true },

  // Auto-generated title from first user message
  title: { type: String, default: 'Nouvelle conversation', maxlength: 120 },

  // Conversation history (full transcript)
  messages: { type: [messageSchema], default: [] },

  // Lead info captured by the assistant during the conversation
  leadInfo: {
    name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    company: { type: String, default: null },
    projectType: { type: String, default: null },        // vitrine | webapp | mobile | crm | ecommerce | other
    budget: { type: String, default: null },             // <5k | 5-15k | 15-50k | >50k
    timeline: { type: String, default: null },           // urgent | normal | flexible
    summary: { type: String, default: null }             // assistant-generated summary
  },

  // Lifecycle
  status: {
    type: String,
    enum: ['open', 'qualified', 'notified', 'converted', 'lost'],
    default: 'open',
    index: true
  },

  // Email notification trigger
  notifiedAt: { type: Date, default: null },

  // Optional: link to user if logged in
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  // Client meta for analytics
  userAgent: { type: String, default: null },
  ip: { type: String, default: null },
}, {
  timestamps: true
});

projectChatSchema.index({ createdAt: -1 });

const ProjectChat = mongoose.model('ProjectChat', projectChatSchema);

export default ProjectChat;
