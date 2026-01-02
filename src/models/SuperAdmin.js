const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  role: {
    type: String,
    default: 'super_admin',
    immutable: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // OTP related fields
  currentOTP: {
    code: String,
    expiresAt: Date,
    attempts: {
      type: Number,
      default: 0
    }
  },
  // 1F Auth token for OTP verification
  tempAuthToken: {
    token: String,
    expiresAt: Date
  },
  // Token blacklist for logout functionality
  blacklistedTokens: [{
    token: String,
    expiresAt: Date
  }],
  lastLogin: {
    type: Date
  },
  // Session management
  activeSessions: [{
    token: String,
    expiresAt: Date,
    ipAddress: String,
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Note: indexes are automatically created by unique: true
// superAdminSchema.index({ username: 1 }); // Removed - unique: true creates index
// superAdminSchema.index({ email: 1 }); // Removed - unique: true creates index

// Method to clear expired OTP
superAdminSchema.methods.clearExpiredOTP = function() {
  if (this.currentOTP && this.currentOTP.expiresAt < new Date()) {
    this.currentOTP = undefined;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to clear expired temp token
superAdminSchema.methods.clearExpiredTempToken = function() {
  if (this.tempAuthToken && this.tempAuthToken.expiresAt < new Date()) {
    this.tempAuthToken = undefined;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to check if token is blacklisted
superAdminSchema.methods.isTokenBlacklisted = function(token) {
  if (!this.blacklistedTokens || this.blacklistedTokens.length === 0) {
    return false;
  }
  
  const now = new Date();
  // Clean up expired tokens
  this.blacklistedTokens = this.blacklistedTokens.filter(blacklisted => blacklisted.expiresAt > now);
  
  // Check if token is in blacklist
  return this.blacklistedTokens.some(blacklisted => blacklisted.token === token);
};

// Method to blacklist a token
superAdminSchema.methods.blacklistToken = function(token, expiresAt) {
  if (!this.blacklistedTokens) {
    this.blacklistedTokens = [];
  }
  
  // Remove expired tokens
  const now = new Date();
  this.blacklistedTokens = this.blacklistedTokens.filter(blacklisted => blacklisted.expiresAt > now);
  
  // Add new token to blacklist
  this.blacklistedTokens.push({
    token,
    expiresAt
  });
  
  return this.save();
};

// Method to add active session
superAdminSchema.methods.addActiveSession = function(token, expiresAt, ipAddress, userAgent) {
  this.activeSessions.push({
    token,
    expiresAt,
    ipAddress,
    userAgent
  });
  
  // Clean up expired sessions
  this.activeSessions = this.activeSessions.filter(session => 
    session.expiresAt > new Date()
  );
  
  return this.save();
};

// Method to remove active session
superAdminSchema.methods.removeActiveSession = function(token) {
  this.activeSessions = this.activeSessions.filter(session => 
    session.token !== token
  );
  return this.save();
};

// Static method to find by username
superAdminSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase().trim() });
};

// Static method to find by email
superAdminSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Virtual for admin profile (excluding sensitive data)
superAdminSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
});

// Ensure virtual fields are serialized
superAdminSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.currentOTP;
    delete ret.tempAuthToken;
    delete ret.blacklistedTokens;
    delete ret.activeSessions;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
