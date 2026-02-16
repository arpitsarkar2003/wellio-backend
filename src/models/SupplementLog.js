const mongoose = require('mongoose');

const supplementLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  supplementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplement',
    required: [true, 'Supplement ID is required'],
    index: true
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['taken', 'skipped'],
    default: 'taken'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
supplementLogSchema.index({ user: 1, timestamp: -1 });
supplementLogSchema.index({ user: 1, supplementId: 1, timestamp: -1 });

// Pre-save middleware to update timestamps
supplementLogSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find logs by user and month
supplementLogSchema.statics.findByUserAndMonth = function (userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  return this.find({
    user: userId,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  })
    .populate('supplementId', 'name time days')
    .sort({ timestamp: -1 });
};

// Static method to group logs by date
supplementLogSchema.statics.groupByDate = async function (userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const logs = await this.find({
    user: userId,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  })
    .populate('supplementId', 'name time days')
    .sort({ timestamp: -1 });

  // Group by date
  const grouped = {};
  logs.forEach(log => {
    const dateKey = log.timestamp.toISOString().split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(log);
  });

  return grouped;
};

module.exports = mongoose.model('SupplementLog', supplementLogSchema);

















