import mongoose from 'mongoose';

const { Schema } = mongoose;

/* Lightweight user for /discutons chat - no password (soft auth via email + name).
   Decoupled from main User model to keep concerns separated. */
const chatUserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email']
  },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  company: { type: String, trim: true, maxlength: 200, default: null },
  phone: { type: String, trim: true, maxlength: 30, default: null },
  country: { type: String, trim: true, maxlength: 80, default: null },
  // Lifecycle
  conversationCount: { type: Number, default: 0 },
  lastActiveAt: { type: Date, default: Date.now },
}, { timestamps: true });

const ChatUser = mongoose.model('ChatUser', chatUserSchema);

export default ChatUser;
