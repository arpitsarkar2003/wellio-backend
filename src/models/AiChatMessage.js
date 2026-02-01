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
    // Message type: 'text', 'image', 'food_analysis'
    type: {
      type: String,
      enum: ['text', 'image', 'food_analysis'],
      default: 'text',
    },
    // Image attachment (for food images or other images)
    imageUrl: {
      type: String,
      trim: true,
    },
    // Food analysis data (when type is 'food_analysis')
    foodAnalysis: {
      foodName: String,
      visualDescription: String,
      estimatedPortion: String,
      nutrition: {
        calories: Number,
        protein: Number,
        carbs: Number,
        fats: Number,
      },
      clarificationMessage: String,
    },
    // Model used for this message (if AI generated)
    modelUsed: {
      type: String,
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









