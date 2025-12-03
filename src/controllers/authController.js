const User = require('../models/User');
const TokenUtils = require('../utils/tokenUtils');
const OTPUtils = require('../utils/otpUtils');
const EmailUtils = require('../utils/emailUtils');
const PasswordUtils = require('../utils/passwordUtils');
const GoogleAuthUtils = require('../utils/googleAuth');
const FirebaseAdmin = require('../utils/firebaseAdmin');
const ValidationUtils = require('../utils/validationUtils');
const ResponseUtils = require('../utils/responseUtils');

/**
 * Authentication Controllers
 */
class AuthController {

  /**
   * User Signup - POST /signup
   */
  static async signup(req, res) {
    try {
      // Validate request data
      const { error } = ValidationUtils.validateSignup(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const { email, password, name, username, firstName, lastName } = req.body;
      const sanitizedEmail = ValidationUtils.sanitizeEmail(email);

      // Check if user already exists
      const existingUser = await User.findByEmail(sanitizedEmail);
      if (existingUser) {
        return ResponseUtils.conflict(res, 'User with this email already exists');
      }

      // Check if username already exists
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return ResponseUtils.conflict(res, 'Username already exists');
      }

      // Validate password strength (optional - you can enable this)
      // const passwordValidation = PasswordUtils.validatePasswordStrength(password);
      // if (!passwordValidation.isValid) {
      //   return ResponseUtils.validationError(res, passwordValidation.errors);
      // }

      // Hash password using SHA-256 as requested
      const hashedPassword = PasswordUtils.hashPasswordSHA256(password);

      // Create new user
      const newUser = new User({
        email: sanitizedEmail,
        password: hashedPassword,
        name,
        username,
        firstName,
        lastName
      });

      await newUser.save();

      // Send welcome email (optional)
      try {
        await EmailUtils.sendWelcomeEmail(sanitizedEmail);
      } catch (emailError) {
        console.error('Welcome email failed:', emailError.message);
        // Don't fail signup if email fails
      }

      // Return success response
      return ResponseUtils.created(res, 'User account created successfully', {
        user: newUser.fullProfile
      });

    } catch (error) {
      console.error('Signup error:', error.message);
      return ResponseUtils.internalError(res, 'Account creation failed');
    }
  }

  /**
   * User Login - POST /login
   */
  static async login(req, res) {
    try {
      // Validate request data
      const { error } = ValidationUtils.validateLogin(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const { email, password } = req.body;
      const sanitizedEmail = ValidationUtils.sanitizeEmail(email);

      // Find user by email
      const user = await User.findByEmail(sanitizedEmail);
      if (!user) {
        return ResponseUtils.error(res, 'Invalid credentials', 400);
      }

      // Verify password using SHA-256
      const isPasswordValid = PasswordUtils.verifyPasswordSHA256(password, user.password);
      if (!isPasswordValid) {
        return ResponseUtils.error(res, 'Invalid credentials', 400);
      }

      // Clear any expired OTP and temp tokens
      await user.clearExpiredOTP();
      await user.clearExpiredTempToken();

      // Generate and store OTP
      const otpData = OTPUtils.generateOTPWithExpiry(5); // 5 minutes expiry
      user.currentOTP = otpData;

      // Generate 1F authentication token (60 seconds)
      const tempToken = TokenUtils.generate1FToken(user._id);
      user.tempAuthToken = {
        token: tempToken,
        expiresAt: new Date(Date.now() + 60 * 1000) // 60 seconds
      };

      await user.save();

      // Send OTP via email
      const emailResult = await EmailUtils.sendOTPEmail(sanitizedEmail, otpData.code);
      if (!emailResult.success) {
        console.error('OTP email failed:', emailResult.error);
        return ResponseUtils.error(res, 'Failed to send OTP. Please try again.', 500);
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return ResponseUtils.otpSent(res, 'OTP sent to your email address', tempToken);

    } catch (error) {
      console.error('Login error:', error.message);
      return ResponseUtils.internalError(res, 'Login failed');
    }
  }

  /**
   * Verify OTP - POST /verify-otp
   */
  static async verifyOTP(req, res) {
    try {
      // Validate request data
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

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      // Check if temp token matches
      if (!user.tempAuthToken || user.tempAuthToken.token !== token) {
        return ResponseUtils.unauthorized(res, 'Invalid authentication token');
      }

      // Check if temp token has expired
      if (user.tempAuthToken.expiresAt < new Date()) {
        user.tempAuthToken = undefined;
        await user.save();
        return ResponseUtils.unauthorized(res, 'Authentication token has expired');
      }

      // Validate OTP
      const otpValidation = OTPUtils.validateOTP(user.currentOTP, otp);
      if (!otpValidation.isValid) {
        // Increment OTP attempts
        if (user.currentOTP) {
          user.currentOTP = OTPUtils.incrementOTPAttempts(user.currentOTP);
          await user.save();
        }
        return ResponseUtils.error(res, otpValidation.error, 400);
      }

      // OTP is valid - generate access and refresh tokens
      const accessToken = TokenUtils.generateAccessToken(user._id);
      const refreshToken = TokenUtils.generateRefreshToken(user._id);

      // Clear OTP and temp token
      user.currentOTP = undefined;
      user.tempAuthToken = undefined;
      user.isVerified = true; // Mark user as verified

      await user.save();

      const tokens = {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h'
      };

      return ResponseUtils.authSuccess(res, 'Authentication successful', tokens, user.fullProfile);

    } catch (error) {
      console.error('OTP verification error:', error.message);
      return ResponseUtils.internalError(res, 'OTP verification failed');
    }
  }

  /**
   * Google Login - POST /google-login
   */
  static async googleLogin(req, res) {
    try {
      // Validate request data
      const { error } = ValidationUtils.validateGoogleLogin(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const { googleToken } = req.body;

      // Validate Google token format
      const tokenValidation = GoogleAuthUtils.validateTokenFormat(googleToken);
      if (!tokenValidation.isValid) {
        return ResponseUtils.error(res, tokenValidation.error, 400);
      }

      // Verify Google token
      const googleAuth = new GoogleAuthUtils();
      const verificationResult = await googleAuth.verifyGoogleToken(googleToken);

      if (!verificationResult.success) {
        return ResponseUtils.error(res, 'Invalid Google token', 400);
      }

      const googleUser = verificationResult.user;
      let user = await User.findByEmail(googleUser.email);

      if (!user) {
        // Create new user account
        const userData = GoogleAuthUtils.generateGoogleUserData(googleUser);
        user = new User(userData);
        await user.save();

        // Send welcome email
        try {
          await EmailUtils.sendWelcomeEmail(googleUser.email, googleUser.name);
        } catch (emailError) {
          console.error('Welcome email failed:', emailError.message);
        }
      } else if (!user.isGoogleUser) {
        // Update existing user to be a Google user
        user.isGoogleUser = true;
        user.googleId = googleUser.googleId;
        await user.save();
      }

      // Clear any expired OTP and temp tokens
      await user.clearExpiredOTP();
      await user.clearExpiredTempToken();

      // Generate and store OTP (same as regular login)
      const otpData = OTPUtils.generateOTPWithExpiry(5);
      user.currentOTP = otpData;

      // Generate 1F authentication token
      const tempToken = TokenUtils.generate1FToken(user._id);
      user.tempAuthToken = {
        token: tempToken,
        expiresAt: new Date(Date.now() + 60 * 1000)
      };

      await user.save();

      // Send OTP via email
      const emailResult = await EmailUtils.sendOTPEmail(googleUser.email, otpData.code, googleUser.name);
      if (!emailResult.success) {
        console.error('OTP email failed:', emailResult.error);
        return ResponseUtils.error(res, 'Failed to send OTP. Please try again.', 500);
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return ResponseUtils.otpSent(res, 'OTP sent to your email address', tempToken);

    } catch (error) {
      console.error('Google login error:', error.message);
      return ResponseUtils.internalError(res, 'Google login failed');
    }
  }

  /**
   * Logout - POST /logout
   */
  static async logout(req, res) {
    try {
      const authHeader = req.header('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ResponseUtils.error(res, 'Token required for logout', 400);
      }

      const token = TokenUtils.extractTokenFromHeader(authHeader);

      // Try to determine token type and get expiry
      let tokenExpiry;
      let userId;

      try {
        // Try access token first
        const decoded = TokenUtils.verifyAccessToken(token);
        tokenExpiry = TokenUtils.getTokenExpiryDate(token);
        userId = decoded.userId;
      } catch (accessError) {
        try {
          // Try refresh token
          const decoded = TokenUtils.verifyRefreshToken(token);
          tokenExpiry = TokenUtils.getTokenExpiryDate(token);
          userId = decoded.userId;
        } catch (refreshError) {
          return ResponseUtils.error(res, 'Invalid token', 400);
        }
      }

      // Find user and blacklist the token
      const user = await User.findById(userId);
      if (user) {
        await user.blacklistToken(token, tokenExpiry);
      }

      return ResponseUtils.success(res, 'Logged out successfully');

    } catch (error) {
      console.error('Logout error:', error.message);
      return ResponseUtils.internalError(res, 'Logout failed');
    }
  }

  /**
   * Delete Account - DELETE /delete-account
   */
  static async deleteAccount(req, res) {
    try {
      const user = req.user; // From auth middleware

      if (!user) {
        return ResponseUtils.unauthorized(res, 'Authentication required');
      }

      // Delete user account and all related data
      await User.findByIdAndDelete(user._id);

      return ResponseUtils.success(res, 'Account deleted successfully');

    } catch (error) {
      console.error('Delete account error:', error.message);
      return ResponseUtils.internalError(res, 'Account deletion failed');
    }
  }

  /**
   * Refresh Token - POST /refresh-token (bonus endpoint)
   */
  static async refreshToken(req, res) {
    try {
      const user = req.user; // From refresh token middleware
      const oldRefreshToken = req.token;

      // Generate new tokens
      const accessToken = TokenUtils.generateAccessToken(user._id);
      const refreshToken = TokenUtils.generateRefreshToken(user._id);

      // Blacklist the old refresh token
      const tokenExpiry = TokenUtils.getTokenExpiryDate(oldRefreshToken);
      await user.blacklistToken(oldRefreshToken, tokenExpiry);

      const tokens = {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h'
      };

      return ResponseUtils.success(res, 'Tokens refreshed successfully', tokens);

    } catch (error) {
      console.error('Refresh token error:', error.message);
      return ResponseUtils.internalError(res, 'Token refresh failed');
    }
  }

  /**
   * Verify Phone Token - POST /verify-phone-token
   * Verifies Firebase phone authentication token and updates user record
   */
  static async verifyPhoneToken(req, res) {
    try {
      // Validate request data
      const { error } = ValidationUtils.validatePhoneTokenVerification(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const { idToken } = req.body;

      // Verify Firebase ID token
      let decodedToken;
      try {
        decodedToken = await FirebaseAdmin.verifyIdToken(idToken);
      } catch (firebaseError) {
        // Handle expired token specifically
        if (firebaseError.message.includes('expired')) {
          return ResponseUtils.error(res, 'Firebase ID token has expired. Please request a new verification code.', 401);
        }
        // Handle other Firebase errors
        return ResponseUtils.error(res, firebaseError.message || 'Invalid Firebase ID token', 401);
      }

      // Extract phone number from decoded token
      const phoneNumber = FirebaseAdmin.extractPhoneNumber(decodedToken);
      
      if (!phoneNumber) {
        return ResponseUtils.error(res, 'Phone number not found in Firebase token', 400);
      }

      // Find user by Firebase UID or by authenticated user (if token contains user info)
      // For phone verification, we typically need the user to be authenticated first
      // or we match by phone number if user already exists
      let user;

      // Check if user is authenticated (from middleware)
      if (req.user && req.user.id) {
        user = await User.findById(req.user.id);
      } else {
        // Try to find user by phone number
        user = await User.findOne({ phoneNumber });
      }

      if (!user) {
        return ResponseUtils.notFound(res, 'User not found. Please ensure you are logged in or have an account.');
      }

      // Update user record
      user.phoneNumber = phoneNumber;
      user.isPhoneVerified = true;
      await user.save();

      // Return updated user profile
      return ResponseUtils.success(res, 'Phone number verified successfully', {
        user: user.fullProfile
      });

    } catch (error) {
      console.error('Phone token verification error:', error.message);
      
      // Handle Firebase initialization errors
      if (error.message.includes('Firebase service account not configured')) {
        return ResponseUtils.error(res, 'Phone verification service is not configured', 500);
      }

      return ResponseUtils.internalError(res, 'Phone verification failed');
    }
  }

  /**
   * Get User Profile - GET /profile (bonus endpoint)
   */
  static async getProfile(req, res) {
    try {
      const user = req.user; // From auth middleware

      return ResponseUtils.success(res, 'Profile retrieved successfully', user.fullProfile);

    } catch (error) {
      console.error('Get profile error:', error.message);
      return ResponseUtils.internalError(res, 'Profile retrieval failed');
    }
  }
}

module.exports = AuthController;