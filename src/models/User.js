const mongoose = require('mongoose');
const PasswordUtils = require('../utils/passwordUtils');

const userSchema = new mongoose.Schema({
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
    minlength: [6, 'Password must be at least 6 characters long']
  },
  name: {
    type: String,
    trim: true
  },
  username: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  isGoogleUser: {
    type: Boolean,
    default: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isProfileCompleted: {
    type: Boolean,
    default: false
  },
  age: {
    type: Number,
    min: [1, 'Age must be greater than 0'],
    max: [120, 'Age cannot exceed 120']
  },
  height: {
    type: Number,
    min: [1, 'Height must be greater than 0'],
    max: [300, 'Height cannot exceed 300 cm']
  },
  weight: {
    type: Number,
    min: [1, 'Weight must be greater than 0'],
    max: [1000, 'Weight cannot exceed 1000 kg']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  activityLevel: {
    type: String,
    trim: true
  },
  dietaryGoal: {
    type: String,
    trim: true
  },
  dietaryPreferences: [{
    type: String,
    trim: true
  }],
  // Phone verification fields
  phoneNumber: {
    type: String,
    trim: true,
    sparse: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  // Additional profile fields
  profile: {
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
    },
    address: {
      street1: {
        type: String,
        trim: true,
        maxlength: [100, 'Street 1 cannot exceed 100 characters']
      },
      street2: {
        type: String,
        trim: true,
        maxlength: [100, 'Street 2 cannot exceed 100 characters']
      },
      lane: {
        type: String,
        trim: true,
        maxlength: [50, 'Lane cannot exceed 50 characters']
      },
      city: {
        type: String,
        trim: true,
        maxlength: [50, 'City cannot exceed 50 characters']
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, 'State cannot exceed 50 characters']
      },
      pincode: {
        type: String,
        trim: true,
        match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode']
      }
    },
    physicalInfo: {
      currentWeight: {
        type: Number,
        min: [1, 'Weight must be greater than 0'],
        max: [1000, 'Weight cannot exceed 1000 kg']
      },
      currentHeight: {
        type: Number,
        min: [1, 'Height must be greater than 0'],
        max: [300, 'Height cannot exceed 300 cm']
      },
      weightUnit: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      },
      heightUnit: {
        type: String,
        enum: ['cm', 'ft'],
        default: 'cm'
      }
    }
  },
  // Password reset token for regular users
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  // Account activation/deactivation fields
  isActive: {
    type: Boolean,
    default: true
  },
  deactivatedAt: {
    type: Date
  },
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  },
  deactivationReason: {
    type: String,
    trim: true
  },
  // Soft delete fields
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  },
  deletionReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Note: email index is automatically created by unique: true
// Note: googleId index is automatically created by sparse: true

// Pre-save middleware to update timestamps
userSchema.pre('save', async function (next) {
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  next();
});

// Method to compare password using SHA-256
userSchema.methods.comparePassword = function (candidatePassword) {
  return PasswordUtils.verifyPasswordSHA256(candidatePassword, this.password);
};

// Method to check if token is blacklisted
userSchema.methods.isTokenBlacklisted = function (token) {
  const blacklistedToken = this.blacklistedTokens.find(bt => bt.token === token);
  if (!blacklistedToken) return false;

  // Clean up expired tokens
  if (blacklistedToken.expiresAt < new Date()) {
    this.blacklistedTokens = this.blacklistedTokens.filter(bt => bt.expiresAt >= new Date());
    this.save();
    return false;
  }

  return true;
};

// Method to blacklist a token
userSchema.methods.blacklistToken = function (token, expiresAt) {
  this.blacklistedTokens.push({ token, expiresAt });
  return this.save();
};

// Method to clear expired OTP
userSchema.methods.clearExpiredOTP = function () {
  if (this.currentOTP && this.currentOTP.expiresAt < new Date()) {
    this.currentOTP = undefined;
    return this.save();
  }
  return Promise.resolve();
};

// Method to clear expired temp auth token
userSchema.methods.clearExpiredTempToken = function () {
  if (this.tempAuthToken && this.tempAuthToken.expiresAt < new Date()) {
    this.tempAuthToken = undefined;
    return this.save();
  }
  return Promise.resolve();
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

  return resetToken;
};

// Static method to find user by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Static method to find user by Google ID
userSchema.statics.findByGoogleId = function (googleId) {
  return this.findOne({ googleId });
};

// Virtual for user's full profile (excluding sensitive data)
userSchema.virtual('fullProfile').get(function () {
  return {
    id: this._id,
    name: this.name,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    isGoogleUser: this.isGoogleUser,
    isVerified: this.isVerified,
    phoneNumber: this.phoneNumber,
    isPhoneVerified: this.isPhoneVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLogin: this.lastLogin,
    isProfileCompleted: this.isProfileCompleted,
    age: this.age,
    height: this.height,
    weight: this.weight,
    gender: this.gender,
    activityLevel: this.activityLevel,
    dietaryGoal: this.dietaryGoal,
    dietaryPreferences: this.dietaryPreferences,
    profile: this.profile || {}
  };
});

// Virtual for basic profile (for tokens and auth responses)
userSchema.virtual('basicProfile').get(function () {
  return {
    id: this._id,
    email: this.email,
    isGoogleUser: this.isGoogleUser,
    isVerified: this.isVerified,
    phoneNumber: this.phoneNumber,
    isPhoneVerified: this.isPhoneVerified,
    isProfileCompleted: this.isProfileCompleted
  };
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.currentOTP;
    delete ret.tempAuthToken;
    delete ret.blacklistedTokens;
    delete ret.googleId;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);