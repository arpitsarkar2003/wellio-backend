const Joi = require('joi');

/**
 * Validation schemas for authentication endpoints
 */
class ValidationUtils {

  // Email validation schema
  static emailSchema = Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    });

  // Password validation schema
  static passwordSchema = Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required'
    });

  // OTP validation schema
  static otpSchema = Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'OTP must be a 6-digit number',
      'any.required': 'OTP is required'
    });

  // Token validation schema
  static tokenSchema = Joi.string()
    .required()
    .messages({
      'any.required': 'Token is required'
    });

  // Google token validation schema
  static googleTokenSchema = Joi.string()
    .required()
    .messages({
      'any.required': 'Google token is required'
    });

  // Signup validation (full name + username only; no first/last name)
  static validateSignup(data) {
    const schema = Joi.object({
      email: this.emailSchema,
      password: this.passwordSchema,
      name: Joi.string().trim().required().messages({
        'any.required': 'Full name is required',
        'string.empty': 'Full name cannot be empty'
      }),
      username: Joi.string().required().messages({
        'any.required': 'Username is required',
        'string.empty': 'Username cannot be empty'
      })
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Login validation
  static validateLogin(data) {
    const schema = Joi.object({
      email: this.emailSchema,
      password: this.passwordSchema
    });

    return schema.validate(data, { abortEarly: false });
  }

  // OTP verification validation
  static validateOTPVerification(data) {
    const schema = Joi.object({
      token: this.tokenSchema,
      otp: this.otpSchema
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Google login validation
  static validateGoogleLogin(data) {
    const schema = Joi.object({
      googleToken: this.googleTokenSchema
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Phone token verification validation
  static validatePhoneTokenVerification(data) {
    const schema = Joi.object({
      idToken: Joi.string()
        .required()
        .messages({
          'any.required': 'Firebase ID token is required',
          'string.empty': 'Firebase ID token cannot be empty'
        })
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Logout validation
  static validateLogout(data) {
    const schema = Joi.object({
      token: this.tokenSchema
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Format validation errors
  static formatValidationErrors(error) {
    if (!error || !error.details) {
      return ['Validation failed'];
    }

    return error.details.map(detail => detail.message);
  }

  // Sanitize email
  static sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
      return '';
    }
    return email.toLowerCase().trim();
  }

  // Validate request body
  static validateRequestBody(body, requiredFields = []) {
    const errors = [];

    if (!body || typeof body !== 'object') {
      errors.push('Request body is required');
      return errors;
    }

    requiredFields.forEach(field => {
      if (!body[field]) {
        errors.push(`${field} is required`);
      }
    });

    return errors;
  }

  // Profile update validation
  static validateProfileUpdate(data) {
    const schema = Joi.object({
      age: Joi.number().min(1).max(120).allow(null).optional(),
      height: Joi.number().min(1).max(300).allow(null).optional(),
      weight: Joi.number().min(1).max(1000).allow(null).optional(),
      gender: Joi.string().valid('male', 'female', 'other').allow('', null).optional(),
      activityLevel: Joi.string().allow('', null).optional(),
      dietaryGoal: Joi.string().allow('', null).optional(),
      dietaryPreferences: Joi.array().items(Joi.string()).allow(null).optional(),
      phoneNumber: Joi.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .allow('', null)
        .optional()
        .messages({
          'string.pattern.base': 'Please enter a valid phone number'
        }),
      address: Joi.object({
        street1: Joi.string().max(100).allow('', null).optional(),
        street2: Joi.string().max(100).allow('', null).optional(),
        lane: Joi.string().max(50).allow('', null).optional(),
        city: Joi.string().max(50).allow('', null).optional(),
        state: Joi.string().max(50).allow('', null).optional(),
        pincode: Joi.string()
          .pattern(/^[0-9]{6}$/)
          .allow('', null)
          .optional()
          .messages({
            'string.pattern.base': 'Please enter a valid 6-digit pincode'
          })
      }).optional(),
      physicalInfo: Joi.object({
        currentWeight: Joi.number().min(1).max(1000).allow(null).optional(),
        currentHeight: Joi.number().min(1).max(300).allow(null).optional(),
        weightUnit: Joi.string().valid('kg', 'lbs').optional(),
        heightUnit: Joi.string().valid('cm', 'ft').optional()
      }).optional()
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Admin login validation
  static validateAdminLogin(data) {
    const schema = Joi.object({
      username: Joi.string().min(3).max(20).required().messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 20 characters',
        'any.required': 'Username is required'
      }),
      password: this.passwordSchema
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Admin creation validation (email and username only, no password)
  static validateAdminCreation(data) {
    const schema = Joi.object({
      username: Joi.string()
        .min(3)
        .max(20)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .required()
        .messages({
          'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
          'string.min': 'Username must be at least 3 characters long',
          'string.max': 'Username cannot exceed 20 characters',
          'any.required': 'Username is required'
        }),
      email: this.emailSchema
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Password change validation
  static validatePasswordChange(data) {
    const schema = Joi.object({
      currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required'
      }),
      newPassword: Joi.string()
        .min(8)
        .max(128)
        .required()
        .messages({
          'string.min': 'New password must be at least 8 characters long',
          'string.max': 'New password must not exceed 128 characters',
          'any.required': 'New password is required'
        })
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Password recovery validation
  static validatePasswordRecovery(data) {
    const schema = Joi.object({
      username: Joi.string().required().messages({
        'any.required': 'Username is required'
      }),
      securityAnswer: Joi.string().required().messages({
        'any.required': 'Security answer is required'
      }),
      newPassword: Joi.string()
        .min(8)
        .max(128)
        .required()
        .messages({
          'string.min': 'New password must be at least 8 characters long',
          'string.max': 'New password must not exceed 128 characters',
          'any.required': 'New password is required'
        })
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Username validation
  static validateUsername(data) {
    const schema = Joi.object({
      username: Joi.string().required().messages({
        'any.required': 'Username is required'
      })
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Email validation
  static validateEmail(data) {
    const schema = Joi.object({
      email: this.emailSchema
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Password reset validation
  static validatePasswordReset(data) {
    const schema = Joi.object({
      resetToken: Joi.string().required().messages({
        'any.required': 'Reset token is required'
      }),
      newPassword: this.passwordSchema
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Company data validation
  static validateCompanyData(data) {
    const schema = Joi.object({
      name: Joi.string().max(100).required().messages({
        'string.max': 'Company name cannot exceed 100 characters',
        'any.required': 'Company name is required'
      }),
      logo: Joi.object({
        base64Image: Joi.string().optional(),
        imageName: Joi.string().optional()
      }).optional(),
      address: Joi.object({
        street1: Joi.string().max(100).allow('').optional(),
        street2: Joi.string().max(100).allow('').optional(),
        city: Joi.string().max(50).allow('').optional(),
        state: Joi.string().max(50).allow('').optional(),
        pincode: Joi.string()
          .pattern(/^[0-9]{6}$/)
          .allow('')
          .optional(),
        country: Joi.string().max(50).optional()
      }).optional(),
      contactInfo: Joi.object({
        phoneNumbers: Joi.array().items(
          Joi.object({
            number: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
            type: Joi.string().valid('primary', 'secondary', 'support', 'sales').optional(),
            label: Joi.string().max(50).optional()
          })
        ).optional(),
        emails: Joi.array().items(
          Joi.object({
            email: Joi.string().email().required(),
            type: Joi.string().valid('primary', 'support', 'sales', 'info', 'noreply').optional(),
            label: Joi.string().max(50).optional()
          })
        ).optional(),
        website: Joi.string().uri().optional(),
        socialMedia: Joi.object({
          facebook: Joi.string().uri().allow('').optional(),
          twitter: Joi.string().uri().allow('').optional(),
          instagram: Joi.string().uri().allow('').optional(),
          linkedin: Joi.string().uri().allow('').optional(),
          youtube: Joi.string().uri().allow('').optional()
        }).optional()
      }).optional(),
      description: Joi.string().max(1000).allow('').optional(),
      establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
      industry: Joi.string().max(100).allow('').optional()
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Policy data validation
  static validatePolicyData(data) {
    const schema = Joi.object({
      type: Joi.string().valid('privacy_policy', 'terms_conditions').required(),
      title: Joi.string().max(200).required().messages({
        'string.max': 'Title cannot exceed 200 characters',
        'any.required': 'Title is required'
      }),
      content: Joi.string().required().messages({
        'any.required': 'Content is required'
      }),
      originalFileName: Joi.string().optional(),
      changes: Joi.string().optional(),
      metaDescription: Joi.string().max(300).allow('').optional(),
      keywords: Joi.array().items(Joi.string().max(50)).optional()
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Diet Plan validation
  static validateDietPlan(data) {
    const foodEntrySchema = Joi.object({
      name: Joi.string().required().messages({
        'any.required': 'Food name is required'
      }),
      estimatedCalories: Joi.number().min(0).required().messages({
        'number.min': 'Calories cannot be negative',
        'any.required': 'Estimated calories are required'
      }),
      notes: Joi.string().allow('', null).optional()
    });

    const mealSchema = Joi.object({
      mealName: Joi.string().required().messages({
        'any.required': 'Meal name is required'
      }),
      time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
        'string.pattern.base': 'Time must be in HH:MM format',
        'any.required': 'Meal time is required'
      }),
      items: Joi.array().items(foodEntrySchema).optional(),
      preparationNotes: Joi.string().allow('', null).optional()
    });

    const daySchema = Joi.object({
      day: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday').required().messages({
        'any.only': 'Day must be a valid day of the week',
        'any.required': 'Day name is required'
      }),
      meals: Joi.array().items(mealSchema).optional()
    });

    const schema = Joi.object({
      weekSchedule: Joi.array().items(daySchema).optional(),
      isActive: Joi.boolean().optional()
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Diet Plan Meal validation
  static validateDietPlanMeal(data) {
    const foodEntrySchema = Joi.object({
      name: Joi.string().required().messages({
        'any.required': 'Food name is required'
      }),
      estimatedCalories: Joi.number().min(0).required().messages({
        'number.min': 'Calories cannot be negative',
        'any.required': 'Estimated calories are required'
      }),
      notes: Joi.string().allow('', null).optional()
    });

    const schema = Joi.object({
      mealName: Joi.string().optional(),
      time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
        'string.pattern.base': 'Time must be in HH:MM format'
      }),
      items: Joi.array().items(foodEntrySchema).optional(),
      preparationNotes: Joi.string().allow('', null).optional()
    });

    return schema.validate(data, { abortEarly: false });
  }



  // Diet Template validation
  static validateDietTemplate(data) {
    const foodEntrySchema = Joi.object({
      name: Joi.string().required().messages({
        'any.required': 'Food name is required'
      }),
      estimatedCalories: Joi.number().min(0).required().messages({
        'number.min': 'Calories cannot be negative',
        'any.required': 'Estimated calories are required'
      }),
      notes: Joi.string().allow('', null).optional()
    });

    const mealSchema = Joi.object({
      mealName: Joi.string().required().messages({
        'any.required': 'Meal name is required'
      }),
      time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
        'string.pattern.base': 'Time must be in HH:MM format',
        'any.required': 'Meal time is required'
      }),
      items: Joi.array().items(foodEntrySchema).optional(),
      preparationNotes: Joi.string().allow('', null).optional()
    });

    const daySchema = Joi.object({
      day: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday').required().messages({
        'any.only': 'Day must be a valid day of the week',
        'any.required': 'Day name is required'
      }),
      meals: Joi.array().items(mealSchema).optional()
    });

    const schema = Joi.object({
      name: Joi.string().required().messages({
        'any.required': 'Template name is required'
      }),
      description: Joi.string().allow('', null).optional(),
      goal: Joi.string().valid('weight_loss', 'muscle_gain', 'balanced', 'keto', 'vegan').required().messages({
        'any.only': 'Goal must be one of: weight_loss, muscle_gain, balanced, keto, vegan',
        'any.required': 'Goal is required'
      }),
      weekSchedule: Joi.array().items(daySchema).min(7).max(7).required().messages({
        'array.min': 'Week schedule must contain exactly 7 days',
        'array.max': 'Week schedule must contain exactly 7 days',
        'any.required': 'Week schedule is required'
      }),
      isDefault: Joi.boolean().optional()
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Water Intake validation
  static validateWaterIntake(data) {
    const schema = Joi.object({
      amount: Joi.number().min(0).required().messages({
        'number.min': 'Amount cannot be negative',
        'any.required': 'Amount is required',
        'number.base': 'Amount must be a number'
      })
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Water Goal validation
  static validateWaterGoal(data) {
    const schema = Joi.object({
      dailyGoal: Joi.number().min(0).required().messages({
        'number.min': 'Daily goal cannot be negative',
        'any.required': 'Daily goal is required',
        'number.base': 'Daily goal must be a number'
      })
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Supplement validation
  static validateSupplement(data, isUpdate = false) {
    const schema = Joi.object({
      name: isUpdate 
        ? Joi.string().optional()
        : Joi.string().required().messages({
            'any.required': 'Supplement name is required'
          }),
      time: isUpdate
        ? Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
            'string.pattern.base': 'Time must be in HH:MM format'
          })
        : Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
            'string.pattern.base': 'Time must be in HH:MM format',
            'any.required': 'Time is required'
          }),
      days: isUpdate
        ? Joi.array().items(
            Joi.string().valid('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')
          ).min(1).optional().messages({
            'array.min': 'At least one day must be selected',
            'any.only': 'Days must be valid day abbreviations (Mon, Tue, Wed, Thu, Fri, Sat, Sun)'
          })
        : Joi.array().items(
            Joi.string().valid('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')
          ).min(1).required().messages({
            'array.min': 'At least one day must be selected',
            'any.required': 'Days are required',
            'any.only': 'Days must be valid day abbreviations (Mon, Tue, Wed, Thu, Fri, Sat, Sun)'
          }),
      notes: Joi.string().allow('', null).optional()
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Supplement Log validation
  static validateSupplementLog(data) {
    const schema = Joi.object({
      supplementId: Joi.string().required().messages({
        'any.required': 'Supplement ID is required'
      }),
      status: Joi.string().valid('taken', 'skipped').required().messages({
        'any.only': 'Status must be either "taken" or "skipped"',
        'any.required': 'Status is required'
      })
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Anonymous email submission validation
  static validateAnonymousEmail(data) {
    const schema = Joi.object({
      email: this.emailSchema
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Email subscription validation
  static validateEmailSubscription(data) {
    const schema = Joi.object({
      email: this.emailSchema
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Email template validation
  static validateEmailTemplate(data) {
    const schema = Joi.object({
      name: Joi.string()
        .required()
        .trim()
        .max(200)
        .messages({
          'any.required': 'Template name is required',
          'string.max': 'Template name cannot exceed 200 characters',
          'string.empty': 'Template name cannot be empty'
        }),
      subject: Joi.string()
        .required()
        .trim()
        .max(200)
        .messages({
          'any.required': 'Email subject is required',
          'string.max': 'Subject cannot exceed 200 characters',
          'string.empty': 'Subject cannot be empty'
        }),
      htmlContent: Joi.string()
        .required()
        .messages({
          'any.required': 'HTML content is required'
        }),
      plainTextContent: Joi.string()
        .allow('', null)
        .optional()
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Email template update validation
  static validateEmailTemplateUpdate(data) {
    const schema = Joi.object({
      name: Joi.string()
        .trim()
        .max(200)
        .optional()
        .messages({
          'string.max': 'Template name cannot exceed 200 characters',
          'string.empty': 'Template name cannot be empty'
        }),
      subject: Joi.string()
        .trim()
        .max(200)
        .optional()
        .messages({
          'string.max': 'Subject cannot exceed 200 characters',
          'string.empty': 'Subject cannot be empty'
        }),
      htmlContent: Joi.string()
        .optional(),
      plainTextContent: Joi.string()
        .allow('', null)
        .optional()
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Email broadcast validation
  static validateEmailBroadcast(data) {
    const schema = Joi.object({
      templateId: Joi.string()
        .required()
        .messages({
          'any.required': 'Template ID is required',
          'string.empty': 'Template ID cannot be empty'
        }),
      batchSize: Joi.number()
        .integer()
        .min(1)
        .max(30)
        .required()
        .messages({
          'any.required': 'Batch size is required',
          'number.min': 'Batch size must be at least 1',
          'number.max': 'Batch size cannot exceed 30',
          'number.base': 'Batch size must be a number'
        }),
      delayBetweenBatches: Joi.number()
        .integer()
        .min(3000)
        .required()
        .messages({
          'any.required': 'Delay between batches is required',
          'number.min': 'Delay between batches must be at least 3 seconds (3000ms)',
          'number.base': 'Delay between batches must be a number'
        })
    });

    return schema.validate(data, { abortEarly: false });
  }

  // Sanitize input
  static sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }
    return input.trim();
  }

  // Common response validation
  static createValidationResponse(error) {
    const errors = this.formatValidationErrors(error);

    return {
      status: 'error',
      message: 'Validation failed',
      errors,
      data: null
    };
  }
}

module.exports = ValidationUtils;
