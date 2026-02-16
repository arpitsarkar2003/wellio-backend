const mongoose = require('mongoose');

const emailBroadcastSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate',
    required: [true, 'Template ID is required'],
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  batchSize: {
    type: Number,
    required: true,
    min: [1, 'Batch size must be at least 1'],
    max: [30, 'Batch size cannot exceed 30']
  },
  delayBetweenBatches: {
    type: Number,
    required: true,
    min: [3000, 'Delay between batches must be at least 3 seconds (3000ms)']
  },
  totalSubscribers: {
    type: Number,
    default: 0
  },
  sentCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

// Index for status queries
emailBroadcastSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EmailBroadcast', emailBroadcastSchema);





