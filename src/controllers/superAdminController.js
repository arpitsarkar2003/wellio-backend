const SuperAdmin = require('../models/SuperAdmin');
const TokenUtils = require('../utils/tokenUtils');
const ValidationUtils = require('../utils/validationUtils');
const ResponseUtils = require('../utils/responseUtils');
const OTPUtils = require('../utils/otpUtils');
const EmailUtils = require('../utils/emailUtils');

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
}

module.exports = SuperAdminController;
