const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Policy type is required'],
    enum: ['privacy_policy', 'terms_conditions'],
    unique: true
  },
  
  title: {
    type: String,
    required: [true, 'Policy title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  content: {
    type: String,
    required: [true, 'Policy content is required'],
    trim: true
  },
  
  // Markdown file information
  originalFileName: {
    type: String,
    trim: true
  },
  
  fileSize: {
    type: Number // Size in bytes
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  
  // Effective dates
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  
  effectiveUntil: {
    type: Date
  },
  
  // Meta information
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    required: true
  },
  
  // Changelog
  changelog: [{
    version: Number,
    changes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // SEO and meta information
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [300, 'Meta description cannot exceed 300 characters']
  },
  
  keywords: [{
    type: String,
    trim: true,
    maxlength: [50, 'Keyword cannot exceed 50 characters']
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
policySchema.index({ type: 1, status: 1 });
policySchema.index({ effectiveFrom: -1 });
policySchema.index({ version: -1 });

// Virtual for word count
policySchema.virtual('wordCount').get(function() {
  if (!this.content) return 0;
  return this.content.trim().split(/\s+/).length;
});

// Virtual for reading time (assuming 200 words per minute)
policySchema.virtual('estimatedReadingTime').get(function() {
  const wordsPerMinute = 200;
  const words = this.wordCount;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
});

// Virtual for current status info
policySchema.virtual('statusInfo').get(function() {
  const now = new Date();
  let status = this.status;
  
  if (this.effectiveFrom > now) {
    status = 'scheduled';
  } else if (this.effectiveUntil && this.effectiveUntil < now) {
    status = 'expired';
  }
  
  return {
    current: status,
    isActive: status === 'published' && this.effectiveFrom <= now && (!this.effectiveUntil || this.effectiveUntil > now)
  };
});

// Pre-save middleware to handle versioning
policySchema.pre('save', function(next) {
  // If content is being modified, increment version
  if (this.isModified('content') && !this.isNew) {
    this.version += 1;
    
    // Add changelog entry if changes are provided
    if (this._changes) {
      this.changelog.push({
        version: this.version,
        changes: this._changes,
        updatedBy: this.lastUpdatedBy,
        updatedAt: new Date()
      });
    }
  }
  
  next();
});

// Method to add changelog entry
policySchema.methods.addChangelogEntry = function(changes, adminId) {
  this._changes = changes;
  this.lastUpdatedBy = adminId;
  return this;
};

// Method to publish policy
policySchema.methods.publish = function(effectiveFrom = new Date()) {
  this.status = 'published';
  this.effectiveFrom = effectiveFrom;
  this.effectiveUntil = undefined;
  return this.save();
};

// Method to archive policy
policySchema.methods.archive = function(effectiveUntil = new Date()) {
  this.status = 'archived';
  this.effectiveUntil = effectiveUntil;
  return this.save();
};

// Method to create draft
policySchema.methods.makeDraft = function() {
  this.status = 'draft';
  return this.save();
};

// Static method to get current privacy policy
policySchema.statics.getCurrentPrivacyPolicy = function() {
  return this.findOne({
    type: 'privacy_policy',
    status: 'published',
    effectiveFrom: { $lte: new Date() },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: null },
      { effectiveUntil: { $gt: new Date() } }
    ]
  }).sort({ version: -1 });
};

// Static method to get current terms & conditions
policySchema.statics.getCurrentTermsConditions = function() {
  return this.findOne({
    type: 'terms_conditions',
    status: 'published',
    effectiveFrom: { $lte: new Date() },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: null },
      { effectiveUntil: { $gt: new Date() } }
    ]
  }).sort({ version: -1 });
};

// Static method to get policy by type
policySchema.statics.getByType = function(type) {
  return this.findOne({
    type,
    status: 'published',
    effectiveFrom: { $lte: new Date() },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: null },
      { effectiveUntil: { $gt: new Date() } }
    ]
  }).sort({ version: -1 });
};

// Static method to create or update policy
policySchema.statics.createOrUpdate = function(type, data, adminId, changes = null) {
  return this.findOneAndUpdate(
    { type },
    { 
      ...data, 
      lastUpdatedBy: adminId,
      _changes: changes 
    },
    { upsert: true, new: true, runValidators: true }
  );
};

// Ensure virtual fields are serialized
policySchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._changes;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Policy', policySchema);
