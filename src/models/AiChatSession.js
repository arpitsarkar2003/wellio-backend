const mongoose = require('mongoose');

/**
 * AiChatSession Model
 * Represents a conversation thread (like ChatGPT conversations)
 * Each session contains multiple messages and has an auto-generated title
 */
const aiChatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Chat',
      trim: true,
    },
    // Flag to track if title has been generated
    titleGenerated: {
      type: Boolean,
      default: false,
    },
    // Store the model being used for this session
    model: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      trim: true,
      default: 'openrouter',
    },
    // Last message timestamp for sorting
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient user session queries, sorted by last message
aiChatSessionSchema.index({ userId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('AiChatSession', aiChatSessionSchema);









