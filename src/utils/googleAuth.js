const { OAuth2Client } = require('google-auth-library');

/**
 * Google OAuth Utility Functions
 */
class GoogleAuthUtils {
  
  constructor() {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  
  // Verify Google OAuth token
  async verifyGoogleToken(token) {
    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Google OAuth not configured - missing GOOGLE_CLIENT_ID');
      }
      
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      
      // Validate required fields
      if (!payload.email || !payload.email_verified) {
        throw new Error('Invalid Google token - email not verified');
      }
      
      return {
        success: true,
        user: {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          emailVerified: payload.email_verified,
          locale: payload.locale
        }
      };
      
    } catch (error) {
      console.error('Google token verification failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Validate Google token format
  static validateTokenFormat(token) {
    if (!token) {
      return { isValid: false, error: 'Google token is required' };
    }
    
    if (typeof token !== 'string') {
      return { isValid: false, error: 'Google token must be a string' };
    }
    
    // Basic JWT format validation (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { isValid: false, error: 'Invalid Google token format' };
    }
    
    return { isValid: true };
  }
  
  // Extract user info from verified payload
  static extractUserInfo(payload) {
    return {
      googleId: payload.sub,
      email: payload.email?.toLowerCase()?.trim(),
      name: payload.name,
      firstName: payload.given_name,
      lastName: payload.family_name,
      picture: payload.picture,
      emailVerified: payload.email_verified,
      locale: payload.locale,
      domain: payload.hd // Hosted domain (for G Suite users)
    };
  }
  
  // Check if email domain is allowed (if domain restrictions are needed)
  static isEmailDomainAllowed(email, allowedDomains = []) {
    if (!allowedDomains || allowedDomains.length === 0) {
      return true; // No restrictions
    }
    
    const domain = email.split('@')[1];
    return allowedDomains.includes(domain);
  }
  
  // Generate user data for Google users
  static generateGoogleUserData(googleUserInfo) {
    return {
      email: googleUserInfo.email,
      isGoogleUser: true,
      googleId: googleUserInfo.googleId,
      isVerified: googleUserInfo.emailVerified,
      // Google users don't need a password for login
      password: this.generateRandomPassword(),
      profile: {
        name: googleUserInfo.name,
        picture: googleUserInfo.picture
      }
    };
  }
  
  // Generate a random password for Google users (they won't use it)
  static generateRandomPassword() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = GoogleAuthUtils;