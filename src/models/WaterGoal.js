const mongoose = require('mongoose');

const waterGoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true,
    index: true
  },
  dailyGoal: {
    type: Number,
    required: [true, 'Daily goal is required'],
    min: [0, 'Daily goal cannot be negative'],
    default: 2000
  }
}, {
  timestamps: true
});

// Pre-save middleware to update timestamps
waterGoalSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find or create goal for user
waterGoalSchema.statics.findOrCreate = async function (userId, defaultGoal = 2000) {
  let goal = await this.findOne({ user: userId });
  
  if (!goal) {
    goal = new this({
      user: userId,
      dailyGoal: defaultGoal
    });
    await goal.save();
  }
  
  return goal;
};

module.exports = mongoose.model('WaterGoal', waterGoalSchema);







