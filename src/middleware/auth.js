const TokenUtils = require('../utils/tokenUtils');
const User = require('../models/User');
const SuperAdmin = require('../models/SuperAdmin');
const ResponseUtils = require('../utils/responseUtils');

/**
 * Authentication middleware for protecting routes
 */
class AuthMiddleware {
  
  // Middleware to verify 1F authentication token
  static async verify1FAuth(req, res, next) {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ResponseUtils.unauthorized(res, 'Access token required');
      }
      
      const token = TokenUtils.extractTokenFromHeader(authHeader);
      
      // Verify the 1F token
      const decoded = TokenUtils.verify1FToken(token);
      
      // Find the user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return ResponseUtils.unauthorized(res, 'User not found');
      }
      
      // Check if user has a valid temp token
      if (!user.tempAuthToken || user.tempAuthToken.token !== token) {
        return ResponseUtils.unauthorized(res, 'Invalid or expired authentication token');
      }
      
      // Check if temp token has expired
      if (user.tempAuthToken.expiresAt < new Date()) {
        // Clear expired token
        user.tempAuthToken = undefined;
        await user.save();
        return ResponseUtils.unauthorized(res, 'Authentication token has expired');
      }
      
      // Attach user and token info to request
      req.user = user;
      req.token = token;
      req.tokenType = '1F';
      
      next();
    } catch (error) {
      console.error('1F Auth middleware error:', error.message);
      return ResponseUtils.unauthorized(res, 'Invalid authentication token');
    }
  }
  
  // Middleware to verify access token (2F authentication)
  static async verifyAccessToken(req, res, next) {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ResponseUtils.unauthorized(res, 'Access token required');
      }
      
      const token = TokenUtils.extractTokenFromHeader(authHeader);
      
      // Verify the access token
      const decoded = TokenUtils.verifyAccessToken(token);
      
      // Find the user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return ResponseUtils.unauthorized(res, 'User not found');
      }

      // Check if user account is active
      if (user.isActive === false) {
        return ResponseUtils.forbidden(res, 'Your account has been deactivated. Please contact support.');
      }
      
      // Check if token is blacklisted
      if (user.isTokenBlacklisted(token)) {
        return ResponseUtils.unauthorized(res, 'Token has been revoked');
      }
      
      // Attach user and token info to request
      req.user = user;
      req.token = token;
      req.tokenType = 'access';
      
      next();
    } catch (error) {
      console.error('Access token middleware error:', error.message);
      return ResponseUtils.unauthorized(res, 'Invalid or expired access token');
    }
  }
  
  // Middleware to verify refresh token
  static async verifyRefreshToken(req, res, next) {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ResponseUtils.unauthorized(res, 'Refresh token required');
      }
      
      const token = TokenUtils.extractTokenFromHeader(authHeader);
      
      // Verify the refresh token
      const decoded = TokenUtils.verifyRefreshToken(token);
      
      // Find the user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return ResponseUtils.unauthorized(res, 'User not found');
      }
      
      // Check if token is blacklisted
      if (user.isTokenBlacklisted(token)) {
        return ResponseUtils.unauthorized(res, 'Token has been revoked');
      }
      
      // Attach user and token info to request
      req.user = user;
      req.token = token;
      req.tokenType = 'refresh';
      
      next();
    } catch (error) {
      console.error('Refresh token middleware error:', error.message);
      return ResponseUtils.unauthorized(res, 'Invalid or expired refresh token');
    }
  }
  
  // Middleware to verify either access or refresh token
  static async verifyAnyToken(req, res, next) {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ResponseUtils.unauthorized(res, 'Authentication token required');
      }
      
      const token = TokenUtils.extractTokenFromHeader(authHeader);
      
      let decoded;
      let tokenType;
      
      // Try to verify as access token first
      try {
        decoded = TokenUtils.verifyAccessToken(token);
        tokenType = 'access';
      } catch (accessError) {
        // If access token fails, try refresh token
        try {
          decoded = TokenUtils.verifyRefreshToken(token);
          tokenType = 'refresh';
        } catch (refreshError) {
          return ResponseUtils.unauthorized(res, 'Invalid or expired token');
        }
      }
      
      // Find the user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return ResponseUtils.unauthorized(res, 'User not found');
      }
      
      // Check if token is blacklisted
      if (user.isTokenBlacklisted(token)) {
        return ResponseUtils.unauthorized(res, 'Token has been revoked');
      }
      
      // Attach user and token info to request
      req.user = user;
      req.token = token;
      req.tokenType = tokenType;
      
      next();
    } catch (error) {
      console.error('Token verification middleware error:', error.message);
      return ResponseUtils.unauthorized(res, 'Token verification failed');
    }
  }
  
  // Middleware to check if user is verified (has completed email verification)
  static async requireVerifiedUser(req, res, next) {
    try {
      if (!req.user) {
        return ResponseUtils.unauthorized(res, 'Authentication required');
      }
      
      if (!req.user.isVerified) {
        return ResponseUtils.forbidden(res, 'Email verification required');
      }
      
      next();
    } catch (error) {
      console.error('User verification middleware error:', error.message);
      return ResponseUtils.internalError(res, 'Verification check failed');
    }
  }
  
  // Middleware to check if user is admin (can be extended later)
  static async requireAdmin(req, res, next) {
    try {
      if (!req.user) {
        return ResponseUtils.unauthorized(res, 'Authentication required');
      }
      
      // For now, you can define admin logic here
      // Example: if (!req.user.isAdmin) { ... }
      
      next();
    } catch (error) {
      console.error('Admin middleware error:', error.message);
      return ResponseUtils.forbidden(res, 'Admin access required');
    }
  }
  
  // Middleware to verify Super Admin access token
  static async verifySuperAdminToken(req, res, next) {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ResponseUtils.unauthorized(res, 'Access token required');
      }
      
      const token = TokenUtils.extractTokenFromHeader(authHeader);
      
      // Verify the access token
      const decoded = TokenUtils.verifyAccessToken(token);
      
      // Check if this is a super admin token
      if (decoded.role !== 'super_admin') {
        return ResponseUtils.forbidden(res, 'Super admin access required');
      }
      
      // Find the super admin
      const admin = await SuperAdmin.findById(decoded.userId);
      if (!admin) {
        return ResponseUtils.unauthorized(res, 'Admin not found');
      }
      
      // Check if account is active
      if (!admin.isActive) {
        return ResponseUtils.forbidden(res, 'Admin account is disabled');
      }
      
      // Check if account is locked
      if (admin.isLocked) {
        return ResponseUtils.forbidden(res, 'Admin account is locked');
      }
      
      // Attach admin and token info to request
      req.user = { 
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: 'super_admin',
        profile: admin.profile
      };
      req.token = token;
      req.tokenType = 'access';
      
      next();
    } catch (error) {
      console.error('Super admin token middleware error:', error.message);
      return ResponseUtils.unauthorized(res, 'Invalid or expired access token');
    }
  }
  
  // Middleware to require regular user authentication
  static async requireAuth(req, res, next) {
    return AuthMiddleware.verifyAccessToken(req, res, next);
  }
  
  // Middleware to require super admin authentication
  static async requireSuperAdmin(req, res, next) {
    return AuthMiddleware.verifySuperAdminToken(req, res, next);
  }
  
  // Middleware to extract user from token without requiring authentication
  static async optionalAuth(req, res, next) {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue without authentication
        return next();
      }
      
      const token = TokenUtils.extractTokenFromHeader(authHeader);
      
      try {
        const decoded = TokenUtils.verifyAccessToken(token);
        
        if (decoded.role === 'super_admin') {
          const admin = await SuperAdmin.findById(decoded.userId);
          if (admin && admin.isActive) {
            req.user = { 
              id: admin._id,
              username: admin.username,
              email: admin.email,
              role: 'super_admin',
              profile: admin.profile
            };
            req.token = token;
            req.tokenType = 'access';
          }
        } else {
          const user = await User.findById(decoded.userId);
          if (user && !user.isTokenBlacklisted(token)) {
            req.user = {
              id: user._id,
              email: user.email,
              role: 'user',
              profile: user.fullProfile
            };
            req.token = token;
            req.tokenType = 'access';
          }
        }
      } catch (error) {
        // Invalid token, but continue without authentication
        console.log('Optional auth failed:', error.message);
      }
      
      next();
    } catch (error) {
      console.error('Optional auth middleware error:', error.message);
      next(); // Continue even if there's an error
    }
  }
}

module.exports = AuthMiddleware;
