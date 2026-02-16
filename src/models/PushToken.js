const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  token: {
    type: String,
    required: [true, 'Push token is required'],
    index: true
  },
  deviceType: {
    type: String,
    required: [true, 'Device type is required'],
    enum: ['web', 'ios', 'android'],
    default: 'web'
  },
  deviceInfo: {
    browser: String,
    os: String,
    deviceModel: String,
    userAgent: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one active token per user per device type
pushTokenSchema.index({ user: 1, token: 1 }, { unique: true });

// Pre-save middleware to update timestamps
pushTokenSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find active tokens for a user
pushTokenSchema.statics.findActiveTokensByUser = function (userId) {
  return this.find({ user: userId, isActive: true, isMuted: false });
};

// Static method to find token by user and token string
pushTokenSchema.statics.findByUserAndToken = function (userId, token) {
  return this.findOne({ user: userId, token });
};

// Method to deactivate token
pushTokenSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

// Method to update last used timestamp
pushTokenSchema.methods.updateLastUsed = function () {
  this.lastUsed = new Date();
  return this.save();
};

module.exports = mongoose.model('PushToken', pushTokenSchema);

