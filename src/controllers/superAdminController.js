const SuperAdmin = require('../models/SuperAdmin');
const TokenUtils = require('../utils/tokenUtils');
const ValidationUtils = require('../utils/validationUtils');
const ResponseUtils = require('../utils/responseUtils');

/**
 * Super Admin Management Controllers
 */
class SuperAdminController {
  
  /**
   * Super Admin Login - POST /v1/admin/login
   */
  static async login(req, res) {
    try {
      const { error } = ValidationUtils.validateAdminLogin(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }
      
      const { username, password } = req.body;
      const sanitizedUsername = ValidationUtils.sanitizeInput(username);
      
      // Find admin by username
      const admin = await SuperAdmin.findByUsername(sanitizedUsername);
      if (!admin) {
        return ResponseUtils.error(res, 'Invalid credentials', 400);
      }
      
      // Check if account is locked
      if (admin.isLocked) {
        const lockTime = Math.ceil((admin.lockUntil - Date.now()) / (1000 * 60));
        return ResponseUtils.error(res, `Account is locked. Try again in ${lockTime} minutes`, 423);
      }
      
      // Check if account is active
      if (!admin.isActive) {
        return ResponseUtils.error(res, 'Account is disabled', 403);
      }
      
      // Verify password
      const isPasswordValid = admin.comparePassword(password);
      if (!isPasswordValid) {
        await admin.incLoginAttempts();
        return ResponseUtils.error(res, 'Invalid credentials', 400);
      }
      
      // Reset login attempts and update last login
      await admin.resetLoginAttempts();
      
      // Generate tokens
      const accessToken = TokenUtils.generateAccessToken(admin._id, 'super_admin');
      const refreshToken = TokenUtils.generateRefreshToken(admin._id, 'super_admin');
      
      // Add session tracking
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent') || 'Unknown';
      await admin.addActiveSession(accessToken, new Date(Date.now() + 60 * 60 * 1000), ipAddress, userAgent);
      
      const tokens = {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h'
      };
      
      return ResponseUtils.success(res, 'Login successful', {
        admin: admin.profile,
        tokens
      });
      
    } catch (error) {
      console.error('Admin login error:', error.message);
      return ResponseUtils.internalError(res, 'Login failed');
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
   * Change Password - PUT /v1/admin/change-password
   */
  static async changePassword(req, res) {
    try {
      const { error } = ValidationUtils.validatePasswordChange(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }
      
      const { currentPassword, newPassword } = req.body;
      const adminId = req.user.id;
      
      // Find admin
      const admin = await SuperAdmin.findById(adminId);
      if (!admin) {
        return ResponseUtils.notFound(res, 'Admin not found');
      }
      
      // Verify current password
      const isCurrentPasswordValid = admin.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return ResponseUtils.error(res, 'Current password is incorrect', 400);
      }
      
      // Update password
      admin.password = newPassword; // Will be hashed by pre-save middleware
      await admin.save();
      
      return ResponseUtils.success(res, 'Password changed successfully');
      
    } catch (error) {
      console.error('Change password error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to change password');
    }
  }
  
  /**
   * Recover Password with Security Question - POST /v1/admin/recover-password
   */
  static async recoverPassword(req, res) {
    try {
      const { error } = ValidationUtils.validatePasswordRecovery(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }
      
      const { username, securityAnswer, newPassword } = req.body;
      const sanitizedUsername = ValidationUtils.sanitizeInput(username);
      
      // Find admin by username
      const admin = await SuperAdmin.findByUsername(sanitizedUsername);
      if (!admin) {
        return ResponseUtils.error(res, 'Admin not found', 404);
      }
      
      // Verify security answer
      const isSecurityAnswerValid = admin.compareSecurityAnswer(securityAnswer);
      if (!isSecurityAnswerValid) {
        return ResponseUtils.error(res, 'Security answer is incorrect', 400);
      }
      
      // Update password
      admin.password = newPassword; // Will be hashed by pre-save middleware
      admin.loginAttempts = 0; // Reset any login attempts
      admin.lockUntil = undefined; // Remove any lock
      
      await admin.save();
      
      return ResponseUtils.success(res, 'Password has been reset successfully');
      
    } catch (error) {
      console.error('Password recovery error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to recover password');
    }
  }
  
  /**
   * Get Security Question - POST /v1/admin/security-question
   */
  static async getSecurityQuestion(req, res) {
    try {
      const { error } = ValidationUtils.validateUsername(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }
      
      const { username } = req.body;
      const sanitizedUsername = ValidationUtils.sanitizeInput(username);
      
      // Find admin by username
      const admin = await SuperAdmin.findByUsername(sanitizedUsername);
      if (!admin) {
        // Don't reveal if admin exists or not for security
        return ResponseUtils.success(res, 'Security question retrieved', {
          question: 'Hi, what is your bday?'
        });
      }
      
      return ResponseUtils.success(res, 'Security question retrieved', {
        question: admin.securityQuestion.question
      });
      
    } catch (error) {
      console.error('Get security question error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve security question');
    }
  }
  
  /**
   * Admin Logout - POST /v1/admin/logout
   */
  static async logout(req, res) {
    try {
      const adminId = req.user.id;
      const token = req.token; // Assuming we pass the token in middleware
      
      // Find admin and remove active session
      const admin = await SuperAdmin.findById(adminId);
      if (admin) {
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
      
      const { username, email, password, securityAnswer } = req.body;
      
      // Create super admin
      const admin = new SuperAdmin({
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        password,
        securityQuestion: {
          question: 'Hi, what is your bday?',
          answer: securityAnswer
        }
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
}

module.exports = SuperAdminController;
