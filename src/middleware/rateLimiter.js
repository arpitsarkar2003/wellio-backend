/**
 * Rate limiting middleware for authentication endpoints
 */
class RateLimiter {
  constructor() {
    this.attempts = new Map(); // Store IP attempts
    this.blocked = new Map(); // Store blocked IPs
  }

  // Rate limit for login attempts (Disabled)
  loginRateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    return (req, res, next) => next();
  }

  // Rate limit for OTP requests (Disabled)
  otpRateLimit(maxAttempts = 3, windowMs = 5 * 60 * 1000) {
    return (req, res, next) => next();
  }

  // Rate limit for signup (Disabled)
  signupRateLimit(maxAttempts = 3, windowMs = 60 * 60 * 1000) {
    return (req, res, next) => next();
  }

  // Clear expired entries periodically
  cleanup() {
    const now = Date.now();

    // Clean up attempts
    for (const [key, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(attempt => attempt > now - (60 * 60 * 1000)); // Keep last hour
      if (validAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validAttempts);
      }
    }

    // Clean up blocked IPs
    for (const [ip, blockUntil] of this.blocked.entries()) {
      if (now > blockUntil) {
        this.blocked.delete(ip);
      }
    }
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Start cleanup interval (every 10 minutes)
setInterval(() => {
  rateLimiter.cleanup();
}, 10 * 60 * 1000);

module.exports = rateLimiter;