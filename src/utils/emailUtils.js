const nodemailer = require('nodemailer');

/**
 * Email Service Utility Functions
 */
class EmailUtils {
  
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }
  
  // Initialize email transporter
  initializeTransporter() {
    try {
      // Check if SMTP credentials are configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS || 
          process.env.SMTP_USER === 'your-email@gmail.com' || 
          process.env.SMTP_PASS === 'your-app-specific-password') {
        console.warn('📧 Email service not configured. SMTP credentials missing or using default values.');
        console.warn('   To enable email features, update SMTP_USER and SMTP_PASS in your .env file');
        this.transporter = null;
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      console.log('📧 Email transporter initialized successfully');
    } catch (error) {
      console.error('📧 Email transporter initialization failed:', error.message);
      this.transporter = null;
    }
  }
  
  // Send OTP email
  async sendOTPEmail(email, otp, userName = '') {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }
      
      const mailOptions = {
        from: {
          name: 'Wellio Diet Tracker',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Your Wellio Login OTP',
        html: this.generateOTPEmailTemplate(otp, userName),
        text: `Your Wellio login OTP is: ${otp}. This OTP will expire in 5 minutes. Please do not share this OTP with anyone.`
      };
      
      const result = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('Failed to send OTP email:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Send welcome email
  async sendWelcomeEmail(email, userName = '') {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }
      
      const mailOptions = {
        from: {
          name: 'Wellio Diet Tracker',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Welcome to Wellio!',
        html: this.generateWelcomeEmailTemplate(userName),
        text: `Welcome to Wellio! We're excited to help you on your diet tracking journey.`
      };
      
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('Failed to send welcome email:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Generate OTP email template
  generateOTPEmailTemplate(otp, userName = '') {
    const greeting = userName ? `Hi ${userName}` : 'Hello';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Wellio Login OTP</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
              .content { background: #f9f9f9; padding: 30px; }
              .otp-box { background: white; border: 2px solid #4CAF50; border-radius: 8px; 
                         padding: 20px; text-align: center; margin: 20px 0; }
              .otp-code { font-size: 32px; font-weight: bold; color: #4CAF50; 
                         letter-spacing: 5px; margin: 10px 0; }
              .footer { background: #333; color: white; padding: 15px; text-align: center; 
                       font-size: 12px; }
              .warning { color: #ff6b6b; font-weight: bold; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🥗 Wellio Diet Tracker</h1>
              </div>
              <div class="content">
                  <h2>${greeting}!</h2>
                  <p>You've requested to log in to your Wellio account. Please use the following OTP:</p>
                  
                  <div class="otp-box">
                      <p>Your Login OTP:</p>
                      <div class="otp-code">${otp}</div>
                      <p><small>Valid for 5 minutes</small></p>
                  </div>
                  
                  <p class="warning">⚠️ Never share this OTP with anyone. Wellio will never ask for your OTP via phone or email.</p>
                  
                  <p>If you didn't request this login, please ignore this email or contact our support team.</p>
                  
                  <p>Happy tracking!<br>The Wellio Team</p>
              </div>
              <div class="footer">
                  <p>&copy; 2024 Wellio Diet Tracker. All rights reserved.</p>
                  <p>This is an automated message, please do not reply.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }
  
  // Generate welcome email template
  generateWelcomeEmailTemplate(userName = '') {
    const greeting = userName ? `Hi ${userName}` : 'Welcome';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Wellio</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
              .content { background: #f9f9f9; padding: 30px; }
              .footer { background: #333; color: white; padding: 15px; text-align: center; 
                       font-size: 12px; }
              .feature { margin: 15px 0; padding: 10px; background: white; border-radius: 5px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🥗 Welcome to Wellio!</h1>
              </div>
              <div class="content">
                  <h2>${greeting}!</h2>
                  <p>Thank you for joining Wellio, your personal diet tracking companion!</p>
                  
                  <p>We're excited to help you on your health and wellness journey. With Wellio, you can:</p>
                  
                  <div class="feature">📊 Track your daily nutrition intake</div>
                  <div class="feature">🎯 Set and achieve your health goals</div>
                  <div class="feature">📈 Monitor your progress over time</div>
                  <div class="feature">🍎 Discover healthy meal suggestions</div>
                  
                  <p>Get started by logging your first meal and begin your journey to better health!</p>
                  
                  <p>If you have any questions, our support team is here to help.</p>
                  
                  <p>Happy tracking!<br>The Wellio Team</p>
              </div>
              <div class="footer">
                  <p>&copy; 2024 Wellio Diet Tracker. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }
  
  // Test email connection
  async testConnection() {
    try {
      if (!this.transporter) {
        return { success: false, error: 'Email service not configured' };
      }
      
      await this.transporter.verify();
      return { success: true, message: 'Email service is ready' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new EmailUtils();