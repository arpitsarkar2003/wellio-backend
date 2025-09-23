/**
 * Rate limiting middleware for authentication endpoints
 */
class RateLimiter {
  constructor() {
    this.attempts = new Map(); // Store IP attempts
    this.blocked = new Map(); // Store blocked IPs
  }
  
  // Rate limit for login attempts
  loginRateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Check if IP is currently blocked
      if (this.blocked.has(clientIP)) {
        const blockUntil = this.blocked.get(clientIP);
        if (now < blockUntil) {
          const remainingTime = Math.ceil((blockUntil - now) / 1000 / 60);
          return res.status(429).json({
            status: 'error',
            message: `Too many login attempts. Please try again in ${remainingTime} minutes.`,
            retryAfter: blockUntil
          });
        } else {
          // Unblock the IP
          this.blocked.delete(clientIP);
          this.attempts.delete(clientIP);
        }
      }
      
      // Get current attempts for this IP
      let ipAttempts = this.attempts.get(clientIP) || [];
      
      // Remove attempts outside the current window
      ipAttempts = ipAttempts.filter(attempt => attempt > windowStart);
      
      // Check if max attempts exceeded
      if (ipAttempts.length >= maxAttempts) {
        // Block the IP for the window duration
        this.blocked.set(clientIP, now + windowMs);
        return res.status(429).json({
          status: 'error',
          message: 'Too many login attempts. Please try again later.',
          retryAfter: now + windowMs
        });
      }
      
      // Add current attempt
      ipAttempts.push(now);
      this.attempts.set(clientIP, ipAttempts);
      
      // Add remaining attempts to response headers
      res.set({
        'X-RateLimit-Limit': maxAttempts,
        'X-RateLimit-Remaining': Math.max(0, maxAttempts - ipAttempts.length),
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });
      
      next();
    };
  }
  
  // Rate limit for OTP requests
  otpRateLimit(maxAttempts = 3, windowMs = 5 * 60 * 1000) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      const email = req.body.email;
      const key = `${clientIP}-${email}`;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Get current attempts for this IP+email combination
      let attempts = this.attempts.get(key) || [];
      
      // Remove attempts outside the current window
      attempts = attempts.filter(attempt => attempt > windowStart);
      
      // Check if max attempts exceeded
      if (attempts.length >= maxAttempts) {
        return res.status(429).json({
          status: 'error',
          message: 'Too many OTP requests. Please try again later.',
          retryAfter: windowStart + windowMs
        });
      }
      
      // Add current attempt
      attempts.push(now);
      this.attempts.set(key, attempts);
      
      next();
    };
  }
  
  // Rate limit for signup
  signupRateLimit(maxAttempts = 3, windowMs = 60 * 60 * 1000) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Get current attempts for this IP
      let ipAttempts = this.attempts.get(clientIP) || [];
      
      // Remove attempts outside the current window
      ipAttempts = ipAttempts.filter(attempt => attempt > windowStart);
      
      // Check if max attempts exceeded
      if (ipAttempts.length >= maxAttempts) {
        return res.status(429).json({
          status: 'error',
          message: 'Too many signup attempts. Please try again later.',
          retryAfter: windowStart + windowMs
        });
      }
      
      // Add current attempt
      ipAttempts.push(now);
      this.attempts.set(clientIP, ipAttempts);
      
      next();
    };
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