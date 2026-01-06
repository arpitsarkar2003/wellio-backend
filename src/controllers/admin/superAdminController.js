const SuperAdmin = require('../../models/SuperAdmin');
const TokenUtils = require('../../utils/tokenUtils');
const ValidationUtils = require('../../utils/validationUtils');
const ResponseUtils = require('../../utils/responseUtils');
const OTPUtils = require('../../utils/otpUtils');
const EmailUtils = require('../../utils/emailUtils');

/**
 * Super Admin Management Controllers
 */
class SuperAdminController {
  
  /**
   * Super Admin Login - POST /v1/admin/login
   * Sends OTP to admin email
   */
  static async login(req, res) {
    try {
      const { error } = ValidationUtils.validateEmail(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }
      
      const { email } = req.body;
      const sanitizedEmail = ValidationUtils.sanitizeEmail(email);
      
      // Find admin by email
      const admin = await SuperAdmin.findByEmail(sanitizedEmail);
      if (!admin) {
        return ResponseUtils.error(res, 'Admin not found', 404);
      }
      
      // Check if account is active
      if (!admin.isActive) {
        return ResponseUtils.error(res, 'Account is disabled', 403);
      }
      
      // Clear any expired OTP and temp tokens
      await admin.clearExpiredOTP();
      await admin.clearExpiredTempToken();
      
      // Generate and store OTP
      const otpData = OTPUtils.generateOTPWithExpiry(5); // 5 minutes expiry
      admin.currentOTP = otpData;
      
      // Generate 1F authentication token (60 seconds)
      const tempToken = TokenUtils.generate1FToken(admin._id);
      admin.tempAuthToken = {
        token: tempToken,
        expiresAt: new Date(Date.now() + 60 * 1000) // 60 seconds
      };
      
      await admin.save();
      
      // Send OTP via email
      const emailResult = await EmailUtils.sendOTPEmail(sanitizedEmail, otpData.code, admin.username);
      if (!emailResult.success) {
        console.error('OTP email failed:', emailResult.error);
        return ResponseUtils.error(res, 'Failed to send OTP. Please try again.', 500);
      }
      
      // Update last login
      admin.lastLogin = new Date();
      await admin.save();
      
      return ResponseUtils.otpSent(res, 'OTP sent to your email address', tempToken);
      
    } catch (error) {
      console.error('Admin login error:', error.message);
      return ResponseUtils.internalError(res, 'Login failed');
    }
  }
  
  /**
   * Verify OTP - POST /v1/admin/verify-otp
   * Verifies OTP and returns access & refresh tokens
   */
  static async verifyOTP(req, res) {
    try {
      const { error } = ValidationUtils.validateOTPVerification(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }
      
      const { token, otp } = req.body;
      
      // Verify 1F token
      let decoded;
      try {
        decoded = TokenUtils.verify1FToken(token);
      } catch (tokenError) {
        return ResponseUtils.unauthorized(res, 'Invalid or expired authentication token');
      }
      
      // Find admin
      const admin = await SuperAdmin.findById(decoded.userId);
      if (!admin) {
        return ResponseUtils.notFound(res, 'Admin not found');
      }
      
      // Check if temp token matches
      if (!admin.tempAuthToken || admin.tempAuthToken.token !== token) {
        return ResponseUtils.unauthorized(res, 'Invalid authentication token');
      }
      
      // Check if temp token has expired
      if (admin.tempAuthToken.expiresAt < new Date()) {
        admin.tempAuthToken = undefined;
        await admin.save();
        return ResponseUtils.unauthorized(res, 'Authentication token has expired');
      }
      
      // Check for default OTP (if configured in environment)
      const defaultOTP = process.env.DEFAULT_OTP;
      
      if (defaultOTP && otp.toString() === defaultOTP.toString()) {
        // Default OTP matches - bypass normal validation
      } else {
        // Validate OTP normally
        const otpValidation = OTPUtils.validateOTP(admin.currentOTP, otp);
        if (!otpValidation.isValid) {
          // Increment OTP attempts
          if (admin.currentOTP) {
            admin.currentOTP = OTPUtils.incrementOTPAttempts(admin.currentOTP);
            await admin.save();
          }
          return ResponseUtils.error(res, otpValidation.error, 400);
        }
      }
      
      // OTP is valid - generate access and refresh tokens
      const accessToken = TokenUtils.generateAccessToken(admin._id, 'super_admin');
      const refreshToken = TokenUtils.generateRefreshToken(admin._id, 'super_admin');
      
      // Clear OTP and temp token
      admin.currentOTP = undefined;
      admin.tempAuthToken = undefined;
      
      // Add session tracking
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent') || 'Unknown';
      await admin.addActiveSession(accessToken, new Date(Date.now() + 60 * 60 * 1000), ipAddress, userAgent);
      
      await admin.save();
      
      const tokens = {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h'
      };
      
      return ResponseUtils.authSuccess(res, 'Authentication successful', tokens, admin.profile);
      
    } catch (error) {
      console.error('OTP verification error:', error.message);
      return ResponseUtils.internalError(res, 'OTP verification failed');
    }
  }
  
  /**
   * Get Admin Profile - GET /v1/admin/profile
   */
  static async getProfile(req, res) {
    try {
      const adminId = req.user.id;
      
      const admin = await SuperAdmin.findById(adminId);
      if (!admin) {
        return ResponseUtils.notFound(res, 'Admin not found');
      }
      
      return ResponseUtils.success(res, 'Profile retrieved successfully', {
        admin: admin.profile
      });
      
    } catch (error) {
      console.error('Get admin profile error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve profile');
    }
  }
  
  
  /**
   * Admin Logout - POST /v1/admin/logout
   */
  static async logout(req, res) {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ResponseUtils.error(res, 'Token required for logout', 400);
      }
      
      const token = TokenUtils.extractTokenFromHeader(authHeader);
      const adminId = req.user.id;
      
      // Find admin and blacklist the token
      const admin = await SuperAdmin.findById(adminId);
      if (admin) {
        // Get token expiry
        const tokenExpiry = TokenUtils.getTokenExpiryDate(token);
        await admin.blacklistToken(token, tokenExpiry);
        // Also remove from active sessions
        await admin.removeActiveSession(token);
      }
      
      return ResponseUtils.success(res, 'Logged out successfully');
      
    } catch (error) {
      console.error('Admin logout error:', error.message);
      return ResponseUtils.internalError(res, 'Logout failed');
    }
  }
  
  /**
   * Create Initial Super Admin (One-time setup) - POST /v1/admin/setup
   */
  static async createInitialAdmin(req, res) {
    try {
      // Check if any super admin already exists
      const existingAdmin = await SuperAdmin.findOne({});
      if (existingAdmin) {
        return ResponseUtils.error(res, 'Super admin already exists', 400);
      }
      
      const { error } = ValidationUtils.validateAdminCreation(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }
      
      const { username, email } = req.body;
      
      // Create super admin
      const admin = new SuperAdmin({
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim()
      });
      
      await admin.save();
      
      return ResponseUtils.created(res, 'Super admin created successfully', {
        admin: admin.profile
      });
      
    } catch (error) {
      console.error('Create admin error:', error.message);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ResponseUtils.validationError(res, validationErrors);
      }
      
      if (error.code === 11000) {
        return ResponseUtils.conflict(res, 'Username or email already exists');
      }
      
      return ResponseUtils.internalError(res, 'Failed to create super admin');
    }
  }
  
  /**
   * Get Active Sessions - GET /v1/admin/sessions
   */
  static async getActiveSessions(req, res) {
    try {
      const adminId = req.user.id;
      
      const admin = await SuperAdmin.findById(adminId).select('activeSessions');
      if (!admin) {
        return ResponseUtils.notFound(res, 'Admin not found');
      }
      
      // Clean up expired sessions
      const now = new Date();
      const activeSessions = admin.activeSessions.filter(session => session.expiresAt > now);
      
      return ResponseUtils.success(res, 'Active sessions retrieved', {
        sessions: activeSessions.map(session => ({
          id: session._id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt
        }))
      });
      
    } catch (error) {
      console.error('Get sessions error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve sessions');
    }
  }
  
  /**
   * Revoke Session - DELETE /v1/admin/sessions/:sessionId
   */
  static async revokeSession(req, res) {
    try {
      const adminId = req.user.id;
      const { sessionId } = req.params;
      
      const admin = await SuperAdmin.findById(adminId);
      if (!admin) {
        return ResponseUtils.notFound(res, 'Admin not found');
      }
      
      // Remove the specific session
      admin.activeSessions = admin.activeSessions.filter(session => 
        session._id.toString() !== sessionId
      );
      
      await admin.save();
      
      return ResponseUtils.success(res, 'Session revoked successfully');
      
    } catch (error) {
      console.error('Revoke session error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to revoke session');
    }
  }

  /**
   * List Super Admins - GET /v1/admin/admins
   */
  static async listAdmins(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Validate pagination
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      // Build query
      const query = { deletedAt: { $exists: false } }; // Exclude deleted admins

      // Filter by active status
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      // Sort options
      const sortOptions = {};
      const validSortFields = ['createdAt', 'updatedAt', 'lastLogin', 'username', 'email'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const skip = (pageNum - 1) * limitNum;
      const admins = await SuperAdmin.find(query)
        .select('-password -blacklistedTokens -currentOTP -tempAuthToken -securityAnswer')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Add active session count to each admin
      const adminsWithSessions = await Promise.all(
        admins.map(async (admin) => {
          const adminDoc = await SuperAdmin.findById(admin._id);
          const activeSessionsCount = adminDoc ? adminDoc.getActiveSessionCount() : 0;
          return {
            ...admin,
            activeSessionsCount
          };
        })
      );

      const totalAdmins = await SuperAdmin.countDocuments(query);
      const totalPages = Math.ceil(totalAdmins / limitNum);

      return ResponseUtils.success(res, 'Super admins retrieved successfully', {
        admins: adminsWithSessions,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalAdmins,
          limit: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });

    } catch (error) {
      console.error('List admins error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve super admins');
    }
  }

  /**
   * Create Super Admin - POST /v1/admin/admins
   */
  static async createAdmin(req, res) {
    try {
      const { username, email, password, securityQuestion, securityAnswer } = req.body;
      const currentAdminId = req.user.id;

      // Validate required fields
      if (!username || !email) {
        return ResponseUtils.validationError(res, ['Username and email are required']);
      }

      // Check if username already exists
      const existingUsername = await SuperAdmin.findByUsername(username);
      if (existingUsername) {
        return ResponseUtils.conflict(res, 'Username already exists');
      }

      // Check if email already exists
      const existingEmail = await SuperAdmin.findByEmail(email);
      if (existingEmail) {
        return ResponseUtils.conflict(res, 'Email already exists');
      }

      // Create new admin
      const adminData = {
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        createdBy: currentAdminId,
        isActive: true
      };

      // Add password if provided (optional - current auth uses OTP)
      if (password) {
        const PasswordUtils = require('../../utils/passwordUtils');
        adminData.password = PasswordUtils.hashPasswordSHA256(password);
      }

      // Add security question/answer if provided
      if (securityQuestion) {
        adminData.securityQuestion = securityQuestion.trim();
      }

      if (securityAnswer) {
        const PasswordUtils = require('../../utils/passwordUtils');
        adminData.securityAnswer = PasswordUtils.hashPasswordSHA256(securityAnswer.trim());
      }

      const admin = new SuperAdmin(adminData);
      await admin.save();

      // Send welcome email if email service is configured
      try {
        // TODO: Implement sendWelcomeEmail for admins in EmailUtils
        console.log(`New super admin created: ${email}`);
        // await EmailUtils.sendAdminWelcomeEmail(email, username);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError.message);
        // Don't fail the request if email fails
      }

      return ResponseUtils.created(res, 'Super admin created successfully', {
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
          createdBy: admin.createdBy
        }
      });

    } catch (error) {
      console.error('Create admin error:', error.message);

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ResponseUtils.validationError(res, validationErrors);
      }

      if (error.code === 11000) {
        return ResponseUtils.conflict(res, 'Username or email already exists');
      }

      return ResponseUtils.internalError(res, 'Failed to create super admin');
    }
  }

  /**
   * Update Super Admin - PUT /v1/admin/admins/:adminId
   */
  static async updateAdmin(req, res) {
    try {
      const { adminId } = req.params;
      const { username, email, securityQuestion, securityAnswer } = req.body;
      const currentAdminId = req.user.id;

      // Prevent updating own account's critical fields (to prevent lockout)
      if (adminId === currentAdminId) {
        if (username || email) {
          return ResponseUtils.error(res, 'Cannot update your own username or email', 400);
        }
      }

      const admin = await SuperAdmin.findById(adminId);
      if (!admin) {
        return ResponseUtils.notFound(res, 'Super admin not found');
      }

      // Check if admin is deleted
      if (admin.deletedAt) {
        return ResponseUtils.error(res, 'Cannot update deleted admin account', 400);
      }

      let shouldInvalidateSessions = false;

      // Update username
      if (username && username !== admin.username) {
        const existingUsername = await SuperAdmin.findByUsername(username);
        if (existingUsername && existingUsername._id.toString() !== adminId) {
          return ResponseUtils.conflict(res, 'Username already exists');
        }
        admin.username = username.toLowerCase().trim();
        shouldInvalidateSessions = true;
      }

      // Update email
      if (email && email !== admin.email) {
        const existingEmail = await SuperAdmin.findByEmail(email);
        if (existingEmail && existingEmail._id.toString() !== adminId) {
          return ResponseUtils.conflict(res, 'Email already exists');
        }
        admin.email = email.toLowerCase().trim();
        shouldInvalidateSessions = true;
      }

      // Update security question
      if (securityQuestion !== undefined) {
        admin.securityQuestion = securityQuestion ? securityQuestion.trim() : undefined;
      }

      // Update security answer (hash it)
      if (securityAnswer !== undefined) {
        const PasswordUtils = require('../../utils/passwordUtils');
        admin.securityAnswer = securityAnswer ? PasswordUtils.hashPasswordSHA256(securityAnswer.trim()) : undefined;
      }

      // Invalidate all sessions if username/email changed
      if (shouldInvalidateSessions) {
        admin.activeSessions = [];
        admin.tempAuthToken = undefined;
      }

      await admin.save();

      const updatedAdmin = await SuperAdmin.findById(adminId)
        .select('-password -blacklistedTokens -currentOTP -tempAuthToken -securityAnswer')
        .lean();

      return ResponseUtils.success(res, 'Super admin updated successfully', {
        admin: updatedAdmin
      });

    } catch (error) {
      console.error('Update admin error:', error.message);

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ResponseUtils.validationError(res, validationErrors);
      }

      if (error.code === 11000) {
        return ResponseUtils.conflict(res, 'Username or email already exists');
      }

      return ResponseUtils.internalError(res, 'Failed to update super admin');
    }
  }

  /**
   * Activate/Deactivate Super Admin - PATCH /v1/admin/admins/:adminId/status
   */
  static async updateAdminStatus(req, res) {
    try {
      const { adminId } = req.params;
      const { isActive, reason } = req.body;
      const currentAdminId = req.user.id;

      if (typeof isActive !== 'boolean') {
        return ResponseUtils.validationError(res, ['isActive must be a boolean']);
      }

      // Prevent deactivating own account
      if (adminId === currentAdminId && !isActive) {
        return ResponseUtils.error(res, 'Cannot deactivate your own account', 400);
      }

      const admin = await SuperAdmin.findById(adminId);
      if (!admin) {
        return ResponseUtils.notFound(res, 'Super admin not found');
      }

      // Check if admin is deleted
      if (admin.deletedAt) {
        return ResponseUtils.error(res, 'Cannot update status of deleted admin account', 400);
      }

      admin.isActive = isActive;

      if (!isActive) {
        // Deactivating
        admin.deactivatedAt = new Date();
        admin.deactivatedBy = currentAdminId;
        admin.deactivationReason = reason || 'Account deactivated by admin';

        // Invalidate all active sessions
        admin.activeSessions = [];
        admin.tempAuthToken = undefined;
      } else {
        // Activating
        admin.deactivatedAt = undefined;
        admin.deactivatedBy = undefined;
        admin.deactivationReason = undefined;
      }

      await admin.save();

      const updatedAdmin = await SuperAdmin.findById(adminId)
        .select('-password -blacklistedTokens -currentOTP -tempAuthToken -securityAnswer')
        .lean();

      return ResponseUtils.success(res, `Super admin ${isActive ? 'activated' : 'deactivated'} successfully`, {
        admin: {
          ...updatedAdmin,
          isActive: admin.isActive,
          deactivatedAt: admin.deactivatedAt,
          deactivatedBy: admin.deactivatedBy,
          deactivationReason: admin.deactivationReason
        }
      });

    } catch (error) {
      console.error('Update admin status error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to update super admin status');
    }
  }

  /**
   * Delete Super Admin - DELETE /v1/admin/admins/:adminId
   */
  static async deleteAdmin(req, res) {
    try {
      const { adminId } = req.params;
      const { reason } = req.body || {};
      const currentAdminId = req.user.id;

      // Prevent deleting own account
      if (adminId === currentAdminId) {
        return ResponseUtils.error(res, 'Cannot delete your own account', 400);
      }

      const admin = await SuperAdmin.findById(adminId);
      if (!admin) {
        return ResponseUtils.notFound(res, 'Super admin not found');
      }

      // Check if already deleted
      if (admin.deletedAt) {
        return ResponseUtils.error(res, 'Super admin is already deleted', 400);
      }

      // Ensure at least one active admin remains
      const activeAdminsCount = await SuperAdmin.countDocuments({
        isActive: true,
        deletedAt: { $exists: false },
        _id: { $ne: adminId }
      });

      if (activeAdminsCount === 0) {
        return ResponseUtils.error(res, 'Cannot delete the last active admin', 400);
      }

      // Soft delete
      admin.deletedAt = new Date();
      admin.deletedBy = currentAdminId;
      admin.deletionReason = reason || 'Account deleted by admin';
      admin.isActive = false;
      admin.deactivatedAt = new Date();
      admin.deactivatedBy = currentAdminId;
      admin.deactivationReason = 'Account deleted';

      // Invalidate all sessions
      admin.activeSessions = [];
      admin.tempAuthToken = undefined;

      await admin.save();

      return ResponseUtils.success(res, 'Super admin deleted successfully', {
        deletedAdminId: adminId,
        deletedAt: admin.deletedAt,
        deletedBy: currentAdminId
      });

    } catch (error) {
      console.error('Delete admin error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to delete super admin');
    }
  }

  /**
   * Reset Super Admin Password - POST /v1/admin/admins/:adminId/reset-password
   */
  static async resetAdminPassword(req, res) {
    try {
      const { adminId } = req.params;
      const { newPassword, sendEmail = false } = req.body;
      const currentAdminId = req.user.id;

      if (!newPassword) {
        return ResponseUtils.validationError(res, ['newPassword is required']);
      }

      const admin = await SuperAdmin.findById(adminId);
      if (!admin) {
        return ResponseUtils.notFound(res, 'Super admin not found');
      }

      // Check if admin is deleted
      if (admin.deletedAt) {
        return ResponseUtils.error(res, 'Cannot reset password for deleted admin account', 400);
      }

      // Hash the new password
      const PasswordUtils = require('../../utils/passwordUtils');
      admin.password = PasswordUtils.hashPasswordSHA256(newPassword);

      // Invalidate all active sessions
      admin.activeSessions = [];
      admin.tempAuthToken = undefined;

      await admin.save();

      // Send email notification if requested
      let emailSent = false;
      if (sendEmail) {
        try {
          // TODO: Implement sendPasswordResetNotificationEmail for admins in EmailUtils
          console.log(`Password has been reset by admin for ${admin.email}`);
          // await EmailUtils.sendAdminPasswordResetNotificationEmail(admin.email, admin.username);
          emailSent = true;
        } catch (emailError) {
          console.error('Failed to send password reset notification email:', emailError.message);
        }
      }

      return ResponseUtils.success(res, 'Password reset successfully', {
        adminId: adminId,
        passwordResetAt: new Date(),
        resetBy: currentAdminId,
        emailSent
      });

    } catch (error) {
      console.error('Reset admin password error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to reset super admin password');
    }
  }

  /**
   * Get Super Admin Statistics - GET /v1/admin/admins/statistics
   */
  static async getAdminStatistics(req, res) {
    try {
      // Exclude deleted admins
      const baseQuery = { deletedAt: { $exists: false } };

      const [
        totalAdmins,
        activeAdmins,
        inactiveAdmins,
        allAdmins
      ] = await Promise.all([
        SuperAdmin.countDocuments(baseQuery),
        SuperAdmin.countDocuments({ ...baseQuery, isActive: true }),
        SuperAdmin.countDocuments({ ...baseQuery, isActive: false }),
        SuperAdmin.find(baseQuery).select('activeSessions createdAt').lean()
      ]);

      // Calculate admins with active sessions and total active sessions
      let adminsWithActiveSessions = 0;
      let totalActiveSessions = 0;

      for (const admin of allAdmins) {
        const adminDoc = await SuperAdmin.findById(admin._id);
        if (adminDoc) {
          const sessionCount = adminDoc.getActiveSessionCount();
          if (sessionCount > 0) {
            adminsWithActiveSessions++;
            totalActiveSessions += sessionCount;
          }
        }
      }

      // Get last admin created
      const lastAdminCreated = allAdmins.length > 0
        ? allAdmins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
        : null;

      return ResponseUtils.success(res, 'Super admin statistics retrieved successfully', {
        totalAdmins,
        activeAdmins,
        inactiveAdmins,
        adminsWithActiveSessions,
        totalActiveSessions,
        lastAdminCreated
      });

    } catch (error) {
      console.error('Get admin statistics error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve super admin statistics');
    }
  }
}

module.exports = SuperAdminController;
