const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  // Basic company information
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  
  // Logo information (stored via imgbb API)
  logo: {
    imageUrl: {
      type: String,
      match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i, 'Please provide a valid image URL']
    },
    thumbnailUrl: {
      type: String
    },
    deleteUrl: {
      type: String // For deleting image from imgbb if needed
    },
    uploadedAt: {
      type: Date
    },
    // Additional logo variants
    landscapeLogo: {
      type: String,
      match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i, 'Please provide a valid image URL']
    },
    portraitLogo: {
      type: String,
      match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i, 'Please provide a valid image URL']
    },
    iconLogo: {
      type: String,
      match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i, 'Please provide a valid image URL']
    }
  },
  
  // Company address
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
    },
    country: {
      type: String,
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters'],
      default: 'India'
    }
  },
  
  // Contact details
  contactInfo: {
    phoneNumbers: [{
      number: {
        type: String,
        trim: true,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
      },
      type: {
        type: String,
        enum: ['primary', 'secondary', 'support', 'sales'],
        default: 'primary'
      },
      label: {
        type: String,
        trim: true,
        maxlength: [50, 'Phone label cannot exceed 50 characters']
      }
    }],
    emails: [{
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
      },
      type: {
        type: String,
        enum: ['primary', 'support', 'sales', 'info', 'noreply'],
        default: 'primary'
      },
      label: {
        type: String,
        trim: true,
        maxlength: [50, 'Email label cannot exceed 50 characters']
      }
    }],
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
    },
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
      youtube: String
    }
  },
  
  // Additional company details
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  establishedYear: {
    type: Number,
    min: [1800, 'Established year cannot be before 1800'],
    max: [new Date().getFullYear(), 'Established year cannot be in the future']
  },
  
  industry: {
    type: String,
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters']
  },
  
  // Meta information
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
companySchema.index({ name: 1 });
companySchema.index({ isActive: 1 });

// Virtual for full address
companySchema.virtual('fullAddress').get(function() {
  const parts = [];
  if (this.address.street1) parts.push(this.address.street1);
  if (this.address.street2) parts.push(this.address.street2);
  if (this.address.city) parts.push(this.address.city);
  if (this.address.state) parts.push(this.address.state);
  if (this.address.pincode) parts.push(this.address.pincode);
  if (this.address.country) parts.push(this.address.country);
  
  return parts.join(', ');
});

// Virtual for primary contact info
companySchema.virtual('primaryContact').get(function() {
  const primaryPhone = this.contactInfo.phoneNumbers.find(p => p.type === 'primary');
  const primaryEmail = this.contactInfo.emails.find(e => e.type === 'primary');
  
  return {
    phone: primaryPhone?.number || null,
    email: primaryEmail?.email || null,
    website: this.contactInfo.website || null
  };
});

// Method to add phone number
companySchema.methods.addPhoneNumber = function(phoneData) {
  this.contactInfo.phoneNumbers.push(phoneData);
  return this.save();
};

// Method to add email
companySchema.methods.addEmail = function(emailData) {
  this.contactInfo.emails.push(emailData);
  return this.save();
};

// Method to update logo
companySchema.methods.updateLogo = function(logoData) {
  this.logo = {
    ...logoData,
    uploadedAt: new Date()
  };
  return this.save();
};

// Method to remove logo (preserves logo variants)
companySchema.methods.removeLogo = function() {
  this.logo.imageUrl = undefined;
  this.logo.thumbnailUrl = undefined;
  this.logo.deleteUrl = undefined;
  this.logo.uploadedAt = undefined;
  return this.save();
};

// Static method to get company info (singleton pattern - only one company record)
companySchema.statics.getCompanyInfo = function() {
  return this.findOne({ isActive: true });
};

// Static method to create or update company info
companySchema.statics.createOrUpdate = function(data, adminId) {
  return this.findOneAndUpdate(
    { isActive: true },
    { ...data, lastUpdatedBy: adminId },
    { upsert: true, new: true, runValidators: true }
  );
};

// Ensure virtual fields are serialized
companySchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Company', companySchema);
