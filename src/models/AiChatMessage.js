const mongoose = require('mongoose');

/**
 * AiChatMessage Model
 * Represents individual messages within a chat session
 * Similar to ChatGPT message structure
 */
const aiChatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AiChatSession',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional metadata for debugging/analytics
    metadata: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient session message queries
aiChatMessageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('AiChatMessage', aiChatMessageSchema);









