const User = require('../models/User');
const ValidationUtils = require('../utils/validationUtils');
const ResponseUtils = require('../utils/responseUtils');
const EmailUtils = require('../utils/emailUtils');

/**
 * User Profile Management Controllers
 */
class UserController {

  /**
   * Get User Profile - GET /v1/user/profile
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      // Find user and exclude sensitive information
      const user = await User.findById(userId).select('-password -blacklistedTokens -currentOTP -tempAuthToken -resetPasswordToken -resetPasswordExpires');

      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      return ResponseUtils.success(res, 'Profile retrieved successfully', {
        user: user.fullProfile
      });

    } catch (error) {
      console.error('Get profile error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve profile');
    }
  }

  /**
   * Update User Profile - PUT /v1/user/profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      // Validate update data
      const { error } = ValidationUtils.validateProfileUpdate(updateData);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      // Ensure profile object exists
      if (!user.profile) {
        user.profile = {};
      }

      // Phone number
      if (updateData.phoneNumber !== undefined) {
        user.profile.phoneNumber = updateData.phoneNumber;
      }

      // Address fields
      if (updateData.address) {
        if (!user.profile.address) user.profile.address = {};

        if (updateData.address.street1 !== undefined) user.profile.address.street1 = updateData.address.street1;
        if (updateData.address.street2 !== undefined) user.profile.address.street2 = updateData.address.street2;
        if (updateData.address.lane !== undefined) user.profile.address.lane = updateData.address.lane;
        if (updateData.address.city !== undefined) user.profile.address.city = updateData.address.city;
        if (updateData.address.state !== undefined) user.profile.address.state = updateData.address.state;
        if (updateData.address.pincode !== undefined) user.profile.address.pincode = updateData.address.pincode;
      }

      // Physical information
      if (updateData.physicalInfo) {
        if (!user.profile.physicalInfo) user.profile.physicalInfo = {};

        if (updateData.physicalInfo.currentWeight !== undefined) user.profile.physicalInfo.currentWeight = updateData.physicalInfo.currentWeight;
        if (updateData.physicalInfo.currentHeight !== undefined) user.profile.physicalInfo.currentHeight = updateData.physicalInfo.currentHeight;
        if (updateData.physicalInfo.weightUnit !== undefined) user.profile.physicalInfo.weightUnit = updateData.physicalInfo.weightUnit;
        if (updateData.physicalInfo.heightUnit !== undefined) user.profile.physicalInfo.heightUnit = updateData.physicalInfo.heightUnit;
      }

      // Check if profile is completed
      // Criteria: Phone number and Physical Info (weight & height) are present
      const hasPhoneNumber = !!user.profile.phoneNumber;
      const hasPhysicalInfo = user.profile.physicalInfo &&
        user.profile.physicalInfo.currentWeight &&
        user.profile.physicalInfo.currentHeight;

      if (hasPhoneNumber && hasPhysicalInfo) {
        user.isProfileCompleted = true;
      }

      // Save user
      await user.save();

      return ResponseUtils.success(res, 'Profile updated successfully', {
        user: user.fullProfile
      });

    } catch (error) {
      console.error('Update profile error:', error.message);

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ResponseUtils.validationError(res, validationErrors);
      }

      return ResponseUtils.internalError(res, 'Failed to update profile');
    }
  }

  /**
   * Get User by ID (for admin purposes) - GET /v1/user/:id
   */
  static async getUserById(req, res) {
    try {
      const { id: targetUserId } = req.params;
      const currentUser = req.user;

      // Check if current user is super admin or requesting their own profile
      if (currentUser.role !== 'super_admin' && currentUser.id !== targetUserId) {
        return ResponseUtils.forbidden(res, 'Access denied. You can only view your own profile.');
      }

      // Find user
      const user = await User.findById(targetUserId).select('-password -blacklistedTokens -currentOTP -tempAuthToken -resetPasswordToken -resetPasswordExpires');

      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      return ResponseUtils.success(res, 'User retrieved successfully', {
        user: user.fullProfile
      });

    } catch (error) {
      console.error('Get user by ID error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve user');
    }
  }

  /**
   * Request Password Reset - POST /v1/user/forgot-password
   */
  static async requestPasswordReset(req, res) {
    try {
      const { error } = ValidationUtils.validateEmail(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const { email } = req.body;
      const sanitizedEmail = ValidationUtils.sanitizeEmail(email);

      // Find user
      const user = await User.findByEmail(sanitizedEmail);
      if (!user) {
        // Don't reveal if user exists or not
        return ResponseUtils.success(res, 'If an account with this email exists, a password reset link has been sent');
      }

      // Generate password reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Send reset email (implement according to your email service)
      try {
        // For now, we'll just log the token. In production, send an email with the reset link
        console.log(`Password reset token for ${sanitizedEmail}: ${resetToken}`);

        // You can implement email sending here
        // await EmailUtils.sendPasswordResetEmail(sanitizedEmail, resetToken);

        return ResponseUtils.success(res, 'If an account with this email exists, a password reset link has been sent');
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError.message);
        return ResponseUtils.success(res, 'If an account with this email exists, a password reset link has been sent');
      }

    } catch (error) {
      console.error('Request password reset error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to process password reset request');
    }
  }

  /**
   * Reset Password - POST /v1/user/reset-password
   */
  static async resetPassword(req, res) {
    try {
      const { error } = ValidationUtils.validatePasswordReset(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const { resetToken, newPassword } = req.body;

      // Hash the token to compare with stored hash
      const crypto = require('crypto');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return ResponseUtils.error(res, 'Invalid or expired reset token', 400);
      }

      // Update password and clear reset token
      user.password = newPassword; // Will be hashed by pre-save middleware
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      return ResponseUtils.success(res, 'Password has been reset successfully');

    } catch (error) {
      console.error('Reset password error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to reset password');
    }
  }

  /**
   * Delete User Account - DELETE /v1/user/account
   */
  static async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        return ResponseUtils.error(res, 'Password is required to delete account', 400);
      }

      // Find user and verify password
      const user = await User.findById(userId);
      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      // Verify password
      const isPasswordValid = user.comparePassword(password);
      if (!isPasswordValid) {
        return ResponseUtils.error(res, 'Invalid password', 400);
      }

      // Delete user account
      await User.findByIdAndDelete(userId);

      return ResponseUtils.success(res, 'Account deleted successfully');

    } catch (error) {
      console.error('Delete account error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to delete account');
    }
  }
}

module.exports = UserController;
