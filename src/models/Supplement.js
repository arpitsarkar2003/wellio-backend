const mongoose = require('mongoose');

const supplementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Supplement name is required'],
    trim: true
  },
  time: {
    type: String,
    required: [true, 'Time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
  },
  days: {
    type: [String],
    required: [true, 'Days are required'],
    validate: {
      validator: function (v) {
        const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return v.length > 0 && v.every(day => validDays.includes(day));
      },
      message: 'Days must be valid day abbreviations (Mon, Tue, Wed, Thu, Fri, Sat, Sun)'
    }
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
supplementSchema.index({ user: 1, createdAt: -1 });

// Pre-save middleware to update timestamps
supplementSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find supplements by user
supplementSchema.statics.findByUser = function (userId) {
  return this.find({ user: userId }).sort({ time: 1 });
};

// Method to check if supplement should be taken on a specific day
supplementSchema.methods.isScheduledForDay = function (dayName) {
  const dayMap = {
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun'
  };
  
  const dayAbbr = dayMap[dayName] || dayName;
  return this.days.includes(dayAbbr);
};

module.exports = mongoose.model('Supplement', supplementSchema);




