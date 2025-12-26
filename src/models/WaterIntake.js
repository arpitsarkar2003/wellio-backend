const mongoose = require('mongoose');

const waterIntakeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries by user and date
waterIntakeSchema.index({ user: 1, timestamp: -1 });
waterIntakeSchema.index({ user: 1, createdAt: -1 });

// Pre-save middleware to update timestamps
waterIntakeSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find entries by user and date range
waterIntakeSchema.statics.findByUserAndDate = function (userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    user: userId,
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).sort({ timestamp: -1 });
};

// Static method to calculate total for a date
waterIntakeSchema.statics.getTotalForDate = async function (userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        timestamp: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  return result.length > 0 ? result[0].total : 0;
};

module.exports = mongoose.model('WaterIntake', waterIntakeSchema);

















