const mongoose = require('mongoose');

const notificationHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  body: {
    type: String,
    required: [true, 'Body is required']
  },
  category: {
    type: String,
    enum: ['reminder', 'diet', 'system', 'meal', 'weight'],
    default: 'system'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  deviceType: {
    type: String,
    enum: ['web', 'ios', 'android'],
    default: 'web'
  },
  deliveryStatus: {
    type: String,
    enum: ['sent', 'failed', 'invalid_token'],
    default: 'sent'
  },
  oneSignalId: {
    type: String,
    index: true
  },
  errorMessage: {
    type: String
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for analytics queries
notificationHistorySchema.index({ user: 1, sentAt: -1 });
notificationHistorySchema.index({ category: 1, sentAt: -1 });
notificationHistorySchema.index({ deliveryStatus: 1, sentAt: -1 });

// Static method to get notification history for a user
notificationHistorySchema.statics.findByUser = function (userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ sentAt: -1 })
    .limit(limit);
};

// Static method to get notification stats for a user
notificationHistorySchema.statics.getStatsByUser = function (userId, startDate, endDate) {
  const match = { user: userId };
  if (startDate || endDate) {
    match.sentAt = {};
    if (startDate) match.sentAt.$gte = startDate;
    if (endDate) match.sentAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'sent'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
        invalidToken: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'invalid_token'] }, 1, 0] } },
        byCategory: {
          $push: {
            category: '$category',
            status: '$deliveryStatus'
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('NotificationHistory', notificationHistorySchema);

