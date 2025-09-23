const crypto = require('crypto');

/**
 * OTP (One-Time Password) Utility Functions
 */
class OTPUtils {
  
  // Generate a 6-digit OTP
  static generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
  }
  
  // Generate OTP with expiry
  static generateOTPWithExpiry(expiryMinutes = 5) {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    return {
      code: otp,
      expiresAt,
      attempts: 0
    };
  }
  
  // Validate OTP
  static validateOTP(storedOTP, providedOTP) {
    if (!storedOTP || !providedOTP) {
      return { isValid: false, error: 'OTP is required' };
    }
    
    // Check if OTP has expired
    if (new Date() > storedOTP.expiresAt) {
      return { isValid: false, error: 'OTP has expired' };
    }
    
    // Check attempt limits (max 3 attempts)
    if (storedOTP.attempts >= 3) {
      return { isValid: false, error: 'Maximum OTP attempts exceeded' };
    }
    
    // Validate OTP code
    if (storedOTP.code !== providedOTP.toString()) {
      return { isValid: false, error: 'Invalid OTP' };
    }
    
    return { isValid: true };
  }
  
  // Increment OTP attempts
  static incrementOTPAttempts(otpData) {
    return {
      ...otpData,
      attempts: (otpData.attempts || 0) + 1
    };
  }
  
  // Generate secure random token for various purposes
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // Hash OTP for additional security (optional)
  static hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }
  
  // Verify hashed OTP
  static verifyHashedOTP(hashedOTP, providedOTP) {
    const hashedProvided = this.hashOTP(providedOTP);
    return hashedOTP === hashedProvided;
  }
}

module.exports = OTPUtils;