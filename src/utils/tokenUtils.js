const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * JWT Token Utility Functions
 */
class TokenUtils {
  
  // Generate 1F Authentication Token (for OTP verification)
  static generate1FToken(userId) {
    const payload = {
      userId,
      type: '1F',
      timestamp: Date.now()
    };
    
    return jwt.sign(payload, process.env.JWT_1F_SECRET, {
      expiresIn: process.env.JWT_1F_EXPIRY || '60s',
      issuer: 'wellio-backend',
      audience: 'wellio-app'
    });
  }
  
  // Generate Access Token (2F Authentication)
  static generateAccessToken(userId, role = null) {
    const payload = {
      userId,
      type: 'access',
      timestamp: Date.now()
    };
    
    // Add role to payload if provided
    if (role) {
      payload.role = role;
    }
    
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h',
      issuer: 'wellio-backend',
      audience: 'wellio-app'
    });
  }
  
  // Generate Refresh Token
  static generateRefreshToken(userId, role = null) {
    const payload = {
      userId,
      type: 'refresh',
      timestamp: Date.now()
    };
    
    // Add role to payload if provided
    if (role) {
      payload.role = role;
    }
    
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '6h',
      issuer: 'wellio-backend',
      audience: 'wellio-app'
    });
  }
  
  // Verify 1F Token
  static verify1FToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_1F_SECRET, {
        issuer: 'wellio-backend',
        audience: 'wellio-app'
      });
    } catch (error) {
      throw new Error('Invalid or expired 1F token');
    }
  }
  
  // Verify Access Token
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
        issuer: 'wellio-backend',
        audience: 'wellio-app'
      });
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }
  
  // Verify Refresh Token
  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        issuer: 'wellio-backend',
        audience: 'wellio-app'
      });
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
  
  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }
    return authHeader.substring(7);
  }
  
  // Get token expiry date
  static getTokenExpiryDate(token) {
    try {
      const decoded = jwt.decode(token);
      return new Date(decoded.exp * 1000);
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }
}

module.exports = TokenUtils;