const mongoose = require('mongoose');
const PasswordUtils = require('../utils/passwordUtils');

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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
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
  // Security question for password recovery
  securityQuestion: {
    question: {
      type: String,
      required: [true, 'Security question is required'],
      default: 'Hi, what is your bday?'
    },
    answer: {
      type: String,
      required: [true, 'Security answer is required']
    }
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
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
  }],
  // Audit log
  lastPasswordChange: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Note: indexes are automatically created by unique: true
// superAdminSchema.index({ username: 1 }); // Removed - unique: true creates index
// superAdminSchema.index({ email: 1 }); // Removed - unique: true creates index

// Virtual for account lock status
superAdminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password and security answer
superAdminSchema.pre('save', async function(next) {
  try {
    // Hash password if modified
    if (this.isModified('password')) {
      this.password = PasswordUtils.hashPasswordSHA256(this.password);
      
      // Update last password change if this is a password update (not initial creation)
      if (!this.isNew) {
        this.lastPasswordChange = new Date();
      }
    }
    
    // Hash security answer if modified (but only if it's not already hashed)
    if (this.isModified('securityQuestion.answer')) {
      const answer = this.securityQuestion.answer;
      // Check if already hashed (64 hex chars)
      const isAlreadyHashed = answer && typeof answer === 'string' && answer.length === 64 && /^[a-f0-9]+$/i.test(answer);
      
      if (!isAlreadyHashed) {
        // Convert to string and hash
        const answerString = String(answer).trim();
        this.securityQuestion.answer = PasswordUtils.hashPasswordSHA256(answerString);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
superAdminSchema.methods.comparePassword = function(candidatePassword) {
  return PasswordUtils.verifyPasswordSHA256(candidatePassword, this.password);
};

// Method to compare security answer
superAdminSchema.methods.compareSecurityAnswer = function(candidateAnswer) {
  const storedAnswer = this.securityQuestion.answer;
  
  // Check if stored answer is hashed (SHA256 produces 64 char hex string)
  const isHashed = storedAnswer && typeof storedAnswer === 'string' && storedAnswer.length === 64 && /^[a-f0-9]+$/i.test(storedAnswer);
  
  if (isHashed) {
    // Normal comparison: compare hashed candidate with stored hash
    return PasswordUtils.verifyPasswordSHA256(candidateAnswer, storedAnswer);
  } else {
    // Plain text comparison: handle both string and number
    const candidateString = String(candidateAnswer).trim();
    const storedString = String(storedAnswer).trim();
    
    // Compare as strings
    if (candidateString === storedString) {
      // If match found and stored is plain text, hash it for future use
      const candidateHash = PasswordUtils.hashPasswordSHA256(candidateString);
      this.securityQuestion.answer = candidateHash;
      this.save().catch(err => console.error('Failed to update security answer hash:', err));
      return true;
    }
    
    // Also try comparing as numbers (in case one is "221009" and other is 221009)
    const candidateNum = Number(candidateString);
    const storedNum = Number(storedString);
    if (!isNaN(candidateNum) && !isNaN(storedNum) && candidateNum === storedNum) {
      // If match found and stored is plain text, hash it for future use
      const candidateHash = PasswordUtils.hashPasswordSHA256(candidateString);
      this.securityQuestion.answer = candidateHash;
      this.save().catch(err => console.error('Failed to update security answer hash:', err));
      return true;
    }
    
    return false;
  }
};

// Method to handle failed login attempts
superAdminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If this is the 5th failed attempt, lock the account for 30 minutes
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 minutes
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts after successful login
superAdminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
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
    lastPasswordChange: this.lastPasswordChange,
    securityQuestion: {
      question: this.securityQuestion.question
      // Don't include the answer
    },
    createdAt: this.createdAt
  };
});

// Ensure virtual fields are serialized
superAdminSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.securityQuestion.answer; // Never expose the security answer
    delete ret.activeSessions;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
